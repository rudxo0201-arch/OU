# 작업 지시서 — Phase 2 Step 1: 파일 업로드 + Cloudflare R2

> 선행 조건: Phase 1 전체 완료
> 완료 기준: PDF 업로드 → R2 저장 → DataNode 생성 → "원본 보기" 동작

---

## 사전 읽기

```
DATA.md              파일 형식별 데이터화 로직, 원본 파일 보존 원칙
DATA_STANDARD.md     source_file_url, source_location, source_file_type
TECH.md              Cloudflare R2 설정
```

---

## 구현 목록

```
[ ] Cloudflare R2 연결 설정
[ ] 파일 업로드 API Route
[ ] ChatInput 파일 첨부 UI (PDF 먼저)
[ ] PDF 텍스트 추출 파서
[ ] 이미지 OCR (Gemini Vision)
[ ] 원본 파일 ↔ DataNode 연결 (source_file_url)
[ ] "원본 보기" 버튼 (DataNode 상세 패널)
[ ] 업로드 진행 상태 UI
```

---

## Step 1. Cloudflare R2 설정

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### `src/lib/storage/r2.ts`

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

// 파일 업로드
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return key;
}

// 서명된 URL 생성 (원본 보기용, 1시간 유효)
export async function getSignedViewUrl(key: string): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
    Key: key,
  }), { expiresIn: 3600 });
}

// R2 키 생성 규칙: userId/timestamp-filename
export function buildR2Key(userId: string, filename: string): string {
  const timestamp = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${timestamp}-${safe}`;
}
```

---

## Step 2. 파일 업로드 API Route

### `src/app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, buildR2Key } from '@/lib/storage/r2';
import { parseFile } from '@/lib/pipeline/file-parser';
import { saveNodeFromFile } from '@/lib/pipeline/layer2-file';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 1. 원본 파일 R2 저장 (파싱 실패해도 이건 반드시 성공해야 함)
  const r2Key = buildR2Key(user.id, file.name);
  await uploadToR2(r2Key, buffer, file.type);

  // 2. 파일 파싱 (실패해도 원본은 이미 저장됨)
  let parsedSections: Array<{ heading: string; body: string }> = [];
  try {
    parsedSections = await parseFile(buffer, file.type, file.name);
  } catch (e) {
    console.error('[upload] 파싱 실패, 원본만 저장:', e);
  }

  // 3. DataNode 생성 (source_file_url 연결)
  const node = await saveNodeFromFile({
    userId: user.id,
    filename: file.name,
    fileType: file.type,
    r2Key,
    sections: parsedSections,
  });

  return NextResponse.json({ success: true, nodeId: node?.id, r2Key });
}
```

---

## Step 3. 파일 파서

### `src/lib/pipeline/file-parser.ts`

```typescript
// 파일 형식별 파서 — PDF 먼저, PPT/HWP는 Phase 2 후반

export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<Array<{ heading: string; body: string }>> {

  if (mimeType === 'application/pdf') {
    return parsePDF(buffer);
  }

  if (mimeType.startsWith('image/')) {
    return parseImageOCR(buffer, mimeType);
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    return parseText(buffer.toString('utf-8'));
  }

  if (mimeType === 'text/csv') {
    return parseCSV(buffer.toString('utf-8'));
  }

  // 지원하지 않는 형식 → 빈 배열 (원본만 저장)
  return [];
}

// PDF 파싱
async function parsePDF(buffer: Buffer) {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);

  // 텍스트를 문단 단위로 분리
  const paragraphs = data.text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 20);

  return paragraphs.map((p, i) => ({
    heading: `문단 ${i + 1}`,
    body: p,
  }));
}

// 이미지 OCR (Gemini Vision)
async function parseImageOCR(buffer: Buffer, mimeType: string) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

  const base64 = buffer.toString('base64');
  const result = await model.generateContent([
    '이 이미지의 텍스트를 추출해줘. 구조를 유지하고 한국어로.',
    { inlineData: { data: base64, mimeType } },
  ]);

  const text = result.response.text();
  return [{ heading: '이미지 텍스트', body: text }];
}

// 텍스트/마크다운
function parseText(text: string) {
  const lines = text.split('\n');
  const sections: Array<{ heading: string; body: string }> = [];
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n') });
      }
      currentHeading = line.replace(/^#+\s*/, '');
      currentBody = [];
    } else if (line.trim()) {
      currentBody.push(line);
    }
  }
  if (currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n') });
  }
  return sections;
}

// CSV
function parseCSV(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0]?.split(',') ?? [];
  return lines.slice(1).map((line, i) => ({
    heading: `행 ${i + 1}`,
    body: line.split(',').map((v, j) => `${headers[j]}: ${v}`).join(', '),
  }));
}
```

```bash
pnpm add pdf-parse
pnpm add -D @types/pdf-parse
```

---

## Step 4. 파일 기반 DataNode 저장

### `src/lib/pipeline/layer2-file.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

interface SaveNodeFromFileInput {
  userId: string;
  filename: string;
  fileType: string;
  r2Key: string;
  sections: Array<{ heading: string; body: string }>;
}

export async function saveNodeFromFile(input: SaveNodeFromFileInput) {
  const supabase = await createClient();

  // source_file_type 매핑
  const fileTypeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/png': 'image',
    'image/jpeg': 'image',
    'text/plain': 'text',
    'text/csv': 'csv',
  };

  // DataNode 생성 — source_file_url 필수 연결
  const { data: node } = await supabase.from('data_nodes').insert({
    user_id: input.userId,
    domain: 'knowledge',       // 파일은 기본 knowledge, 추후 분류
    source_type: 'upload',
    source_file_url: input.r2Key,
    source_file_type: fileTypeMap[input.fileType] ?? 'unknown',
    confidence: 'medium',
    resolution: input.sections.length > 0 ? 'resolved' : 'opaque',
    visibility: 'private',
  }).select().single();

  if (!node || input.sections.length === 0) return node;

  // sections 저장
  for (let i = 0; i < input.sections.length; i++) {
    const section = input.sections[i];
    const { data: sec } = await supabase.from('sections').insert({
      node_id: node.id,
      heading: section.heading,
      order_idx: i,
    }).select().single();

    if (!sec) continue;

    // sentences 저장 (문장 단위 분리)
    const sentences = section.body
      .split(/[.!?]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    for (let j = 0; j < sentences.length; j++) {
      await supabase.from('sentences').insert({
        section_id: sec.id,
        node_id: node.id,
        text: sentences[j],
        order_idx: j,
        embed_status: 'pending',
        embed_tier: 'hot',
      });
    }
  }

  return node;
}
```

---

## Step 5. ChatInput 파일 첨부 UI

`src/components/chat/ChatInput.tsx`에 파일 업로드 추가:

```typescript
// 파일 첨부 상태
const [uploadFile, setUploadFile] = useState<File | null>(null);
const [uploading, setUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

// 허용 파일 형식
const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.txt,.md,.csv';

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) setUploadFile(file);
};

const handleUpload = async () => {
  if (!uploadFile) return;
  setUploading(true);

  const formData = new FormData();
  formData.append('file', uploadFile);

  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  const { nodeId } = await res.json();

  setUploadFile(null);
  setUploading(false);

  // 채팅에 업로드 완료 메시지 추가
  onSend(`[파일 업로드 완료: ${uploadFile.name}] nodeId: ${nodeId}`);
};

// UI: 첨부 버튼 → 파일 선택 → 썸네일 프리뷰 → 전송
```

---

## Step 6. "원본 보기" 버튼

DataNode 상세 패널에 추가:

```typescript
// src/components/views/NodeDetailPanel.tsx
const handleViewOriginal = async () => {
  const res = await fetch(`/api/file/view-url?key=${node.source_file_url}`);
  const { url } = await res.json();
  window.open(url, '_blank');
};

// source_file_url 있는 경우에만 버튼 표시
{node.source_file_url && (
  <Button variant="subtle" size="xs" onClick={handleViewOriginal}>
    원본 보기
  </Button>
)}
```

### `src/app/api/file/view-url/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedViewUrl } from '@/lib/storage/r2';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = req.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'No key' }, { status: 400 });

  // 본인 파일인지 확인
  if (!key.startsWith(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = await getSignedViewUrl(key);
  return NextResponse.json({ url });
}
```

---

## 환경변수 추가

`.env.local`에 추가:
```env
CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET=ou-files
CLOUDFLARE_R2_ACCESS_KEY=
CLOUDFLARE_R2_SECRET_KEY=
```

---

## 완료 체크리스트

```
[ ] Cloudflare R2 버킷 생성 + 환경변수 설정
[ ] PDF 업로드 → R2 저장 확인
[ ] PDF 파싱 → sections/sentences DB 저장 확인
[ ] 이미지 업로드 → Gemini OCR → 텍스트 저장 확인
[ ] 파싱 실패 시에도 R2 원본 저장 확인 (핵심 원칙)
[ ] source_file_url → data_nodes 연결 확인
[ ] "원본 보기" 버튼 → 서명된 URL → 파일 열림
[ ] ChatInput 파일 첨부 → 업로드 진행 상태 표시
[ ] pnpm build 통과
[ ] git commit: "feat: 파일 업로드 + R2 연동 + 원본 파일 보존"
```

---

## 다음 작업

**TASK_PHASE2_VIEWER.md** → OU 내장 뷰어 (PDF.js)
