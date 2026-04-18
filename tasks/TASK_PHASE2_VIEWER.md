# 작업 지시서 — Phase 2 Step 2: OU 내장 뷰어 (PDF.js) + 뷰 구독 시스템

> 선행 조건: TASK_PHASE2_FILE_UPLOAD.md 완료
> 완료 기준: OU 안에서 PDF 렌더링 + 뷰 구독 → 자동 업데이트

---

## 사전 읽기

```
DATA.md        OU 내장 뷰어 (모든 파일 형식이 OU 안에서 렌더링)
PLATFORM.md    레이어 3 구독 시스템 (구독 뷰, 공동 편집 뷰)
VIEWS.md       뷰 타입, 저장된 뷰 시스템
```

---

## 파트 A: OU 내장 뷰어

### 구현 목록
```
[ ] PDF 뷰어 (PDF.js)
[ ] 이미지 뷰어
[ ] 텍스트/마크다운 뷰어
[ ] CSV 뷰어 (표 렌더링)
[ ] /view/[nodeId] 라우트 (원본 파일 뷰어)
```

---

### Step A-1. PDF 뷰어

```bash
pnpm add pdfjs-dist react-pdf
```

### `src/components/viewers/PDFViewer.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Group, ActionIcon, Text, Box, Loader } from '@mantine/core';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  url: string;
  highlightPage?: number;  // source_location.page 기준 자동 스크롤
}

export function PDFViewer({ url, highlightPage }: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(highlightPage ?? 1);
  const [loading, setLoading] = useState(true);

  return (
    <Box>
      {/* 페이지 네비게이션 */}
      <Group justify="center" py="sm">
        <ActionIcon
          variant="subtle"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(p => p - 1)}
        >
          <CaretLeft size={16} />
        </ActionIcon>
        <Text fz="sm">{pageNumber} / {numPages}</Text>
        <ActionIcon
          variant="subtle"
          disabled={pageNumber >= numPages}
          onClick={() => setPageNumber(p => p + 1)}
        >
          <CaretRight size={16} />
        </ActionIcon>
      </Group>

      {loading && <Loader size="sm" mx="auto" display="block" />}

      <Document
        file={url}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setLoading(false);
        }}
      >
        <Page
          pageNumber={pageNumber}
          width={Math.min(window.innerWidth - 48, 800)}
          renderTextLayer
          renderAnnotationLayer
        />
      </Document>
    </Box>
  );
}
```

### `src/components/viewers/FileViewer.tsx`

```typescript
'use client';

// 파일 형식별 뷰어 라우터
import { PDFViewer } from './PDFViewer';
import { Box, Text } from '@mantine/core';

interface FileViewerProps {
  url: string;
  fileType: string;
  highlightPage?: number;
}

export function FileViewer({ url, fileType, highlightPage }: FileViewerProps) {
  if (fileType === 'pdf') {
    return <PDFViewer url={url} highlightPage={highlightPage} />;
  }

  if (fileType === 'image') {
    return (
      <Box p="md">
        <img src={url} alt="업로드 이미지" style={{ maxWidth: '100%' }} />
      </Box>
    );
  }

  if (fileType === 'text' || fileType === 'md') {
    // 텍스트는 iframe으로 렌더링
    return <iframe src={url} style={{ width: '100%', height: 600, border: 'none' }} />;
  }

  return (
    <Box p="xl">
      <Text c="dimmed">이 파일 형식은 아직 내장 뷰어를 지원하지 않아요.</Text>
    </Box>
  );
}
```

### `/view/[nodeId]` 라우트

```typescript
// src/app/(private)/view/[nodeId]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { getSignedViewUrl } from '@/lib/storage/r2';
import { FileViewer } from '@/components/viewers/FileViewer';
import { notFound } from 'next/navigation';

export default async function ViewPage({ params }: { params: { nodeId: string } }) {
  const supabase = await createClient();
  const { data: node } = await supabase
    .from('data_nodes')
    .select('*')
    .eq('id', params.nodeId)
    .single();

  if (!node || !node.source_file_url) return notFound();

  const url = await getSignedViewUrl(node.source_file_url);

  return (
    <FileViewer
      url={url}
      fileType={node.source_file_type ?? 'unknown'}
    />
  );
}
```

---

## 파트 B: 뷰 구독 시스템

### 구현 목록
```
[ ] 뷰 발행 (is_subscribable = true)
[ ] 뷰 구독 API
[ ] 구독자 목록 (view_members)
[ ] 데이터 변경 → 구독자 알림 (Supabase Realtime)
[ ] Sidebar 구독 뷰 표시 (@ 배지)
[ ] 구독 뷰 항상 최신 데이터로 렌더링
```

---

### Step B-1. 뷰 발행 API

```typescript
// src/app/api/views/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { viewId } = await req.json();

  const { data } = await supabase
    .from('saved_views')
    .update({ is_subscribable: true, visibility: 'public' })
    .eq('id', viewId)
    .eq('user_id', user.id)  // 본인 뷰만
    .select()
    .single();

  return NextResponse.json({ view: data });
}
```

### Step B-2. 뷰 구독 API

```typescript
// src/app/api/views/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { viewId } = await req.json();

  // 구독 가능한 뷰인지 확인
  const { data: view } = await supabase
    .from('saved_views')
    .select('*')
    .eq('id', viewId)
    .eq('is_subscribable', true)
    .single();

  if (!view) return NextResponse.json({ error: 'Not subscribable' }, { status: 404 });

  // view_members에 subscriber로 추가
  await supabase.from('view_members').upsert({
    view_id: viewId,
    user_id: user.id,
    role: 'subscriber',
  });

  // subscriber_count 증가
  await supabase.rpc('increment_subscriber_count', { view_id: viewId });

  return NextResponse.json({ success: true });
}
```

### Step B-3. 구독 뷰 알림 (Supabase Realtime)

```typescript
// src/hooks/useViewSubscription.ts
'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { notifications } from '@mantine/notifications';

export function useViewSubscription(userId: string) {
  const supabase = createClient();

  useEffect(() => {
    // 구독한 뷰의 data_nodes 변경 감지
    const channel = supabase
      .channel('view-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'data_nodes',
      }, (payload) => {
        notifications.show({
          title: '구독 뷰 업데이트',
          message: '구독한 뷰에 새 데이터가 추가됐어요',
          color: 'gray',
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
```

### Step B-4. Sidebar 구독 뷰 표시

`src/stores/navigationStore.ts` 수정:

```typescript
interface SavedView {
  id: string;
  name: string;
  icon?: string;
  viewType: string;
  isSubscribed?: boolean;   // @ 배지
  isCollaborative?: boolean; // 👥 배지
}
```

`Sidebar.tsx`에서:
```typescript
// 구독 뷰: @ 배지, 공동 뷰: 👥 배지
{view.isSubscribed && (
  <Badge size="xs" variant="filled" color="gray"
    style={{ position: 'absolute', top: -4, right: -4, fontSize: 8 }}>
    @
  </Badge>
)}
```

---

## 완료 체크리스트

```
파트 A — 내장 뷰어:
[ ] PDF 업로드 후 → /view/[nodeId] → PDF 렌더링
[ ] 페이지 네비게이션 동작
[ ] 이미지 업로드 → 이미지 렌더링
[ ] "원본 보기" 버튼 → FileViewer 열림

파트 B — 구독 시스템:
[ ] 뷰 발행 (is_subscribable 전환)
[ ] 다른 사용자 구독 → view_members 저장
[ ] 데이터 변경 → Realtime 알림
[ ] Sidebar 구독 뷰 @ 배지 표시
[ ] 구독 뷰 항상 최신 데이터로 렌더링

[ ] pnpm build 통과
[ ] git commit: "feat: OU 내장 뷰어 (PDF.js) + 뷰 구독 시스템"
```

---

## 다음 작업

**TASK_PHASE2_SUBSCRIPTION.md** → Pro 구독 + 토큰 제한 + 광고
