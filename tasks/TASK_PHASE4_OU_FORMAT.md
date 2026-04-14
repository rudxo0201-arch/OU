# 작업 지시서 — Phase 4: .ou 시대 + 그래프뷰 게임

> 선행 조건: Phase 3 전체 완료
> 완료 기준: .ou 파일 포맷 + 그래프뷰 게임 생태계 + 글로벌

---

## 사전 읽기

```
PLATFORM.md    레이어 7(그래프뷰 게임), .ou 파일 포맷
ROADMAP.md     Phase 4 항목 전체
```

---

## 파트 A: .ou 파일 포맷

### 목적
```
Word가 .docx를 만들었듯 OU는 .ou를 만든다.
.ou = DataNode + 뷰 설정의 분리된 포맷
     언어 중립, 무한 렌더링 가능
```

### .ou 구조 정의

```typescript
// src/lib/ou-format/types.ts

interface OUFile {
  version: string;           // "1.0"
  metadata: {
    owner: string;           // userId
    language: string;        // "ko"
    created: string;         // ISO8601
    title?: string;
  };
  nodes: OUNode[];
  edges: OUEdge[];
  views: OUView[];
}

interface OUNode {
  id: string;
  domain: string;
  raw: string;
  domain_data?: Record<string, any>;
  triples?: Array<{
    subject: string;
    predicate: string;
    object: string;
  }>;
}

interface OUEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

interface OUView {
  id: string;
  name: string;
  viewType: string;
  filterConfig?: Record<string, any>;
  customCode?: string;
}
```

### .ou 익스포트 API

```typescript
// src/app/api/export/ou/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { nodeIds, viewIds } = await req.json();

  const [{ data: nodes }, { data: edges }, { data: views }] = await Promise.all([
    supabase.from('data_nodes').select('*').in('id', nodeIds),
    supabase.from('node_relations').select('*')
      .in('source_node_id', nodeIds).in('target_node_id', nodeIds),
    supabase.from('saved_views').select('*').in('id', viewIds ?? []),
  ]);

  const ouFile = {
    version: '1.0',
    metadata: { owner: user.id, language: 'ko', created: new Date().toISOString() },
    nodes: nodes ?? [],
    edges: edges ?? [],
    views: views ?? [],
  };

  return new NextResponse(JSON.stringify(ouFile, null, 2), {
    headers: {
      'Content-Type': 'application/ou+json',
      'Content-Disposition': 'attachment; filename="export.ou"',
    },
  });
}
```

### .ou 임포트 API

```typescript
// src/app/api/import/ou/route.ts
// .ou 파일 업로드 → DataNode + 뷰 복원
// 언어 중립: 다른 언어로 된 .ou도 내 언어로 렌더링
```

### OU 내장 .ou 뷰어

```typescript
// src/components/viewers/OUFileViewer.tsx
// .ou 파일을 파싱해서 ViewRenderer로 렌더링
// 파일 형식: application/ou+json
```

---

## 파트 B: 그래프뷰 게임 생태계

### 목적
```
우주 시각화 + 게임적 소유감
노드 = 별/항성/행성
엣지 = 중력/관계
클러스터 = 성운
쌓을수록 우주 성장 → 수집 욕구
```

### 구현 목록
```
[ ] 노드 스킨 시스템 (별형/원형/육각형)
[ ] 엣지 스타일 (실선/점선/빛 번짐)
[ ] 배경 테마 (우주/미니멀/페이퍼/다크글로우)
[ ] 중력 엔진 파라미터 조절 (인력/척력/궤도)
[ ] 스킨 마켓 (/market/skins)
[ ] 탐험 메카닉 (미지의 영역 = 미학습 개념)
[ ] 중요도별 노드 크기 자동 조절
```

### 스킨 시스템

```typescript
// src/lib/graph/skins.ts
export interface NodeSkin {
  id: string;
  name: string;
  shape: 'star' | 'circle' | 'hexagon' | 'planet';
  color: string;
  glowEffect: boolean;
  pulseAnimation: boolean;
}

export interface EdgeSkin {
  id: string;
  name: string;
  style: 'solid' | 'dashed' | 'glow' | 'gradient';
  opacity: number;
  animated: boolean;
}

export interface GraphTheme {
  id: string;
  name: string;
  background: string;    // 배경색
  nodeSkin: NodeSkin;
  edgeSkin: EdgeSkin;
  gravityStrength: number;
  repulsionStrength: number;
}

// 기본 테마
export const DEFAULT_THEMES: GraphTheme[] = [
  {
    id: 'space',
    name: '우주 (기본)',
    background: '#060810',
    nodeSkin: { id: 'star', name: '별', shape: 'star', color: '#ffffff', glowEffect: true, pulseAnimation: true },
    edgeSkin: { id: 'glow', name: '빛 번짐', style: 'glow', opacity: 0.3, animated: true },
    gravityStrength: -120,
    repulsionStrength: 80,
  },
  {
    id: 'minimal',
    name: '미니멀',
    background: '#ffffff',
    nodeSkin: { id: 'circle', name: '원형', shape: 'circle', color: '#1a1a1a', glowEffect: false, pulseAnimation: false },
    edgeSkin: { id: 'solid', name: '실선', style: 'solid', opacity: 0.2, animated: false },
    gravityStrength: -100,
    repulsionStrength: 60,
  },
];
```

### 그래프 설정 패널 업데이트

```typescript
// src/components/graph/GraphSettingsPanel.tsx (기존 파일 수정)
// 테마 선택기 추가
// 중력 파라미터 슬라이더 추가
// 구매한 스킨 목록 표시
```

### 스킨 마켓

```typescript
// src/app/(public)/market/skins/page.tsx
// 구매 가능한 테마/스킨 목록
// 미리보기 (작은 그래프뷰 렌더링)
// Stripe 결제 → 스킨 언락
```

---

## 파트 C: 글로벌 지원

### 언어 중립 렌더링

```typescript
// src/lib/i18n/render.ts
// DataNode의 raw는 원본 언어로 저장
// 렌더링 시 사용자 language 설정 기반으로 번역
// 번역은 캐싱 (Upstash Redis)

export async function renderInUserLanguage(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (sourceLanguage === targetLanguage) return text;

  // 캐시 확인
  const cacheKey = `translate:${sourceLanguage}:${targetLanguage}:${text.slice(0, 50)}`;
  // Redis에서 캐시 확인 후 없으면 번역 API 호출

  return text; // 번역 결과 반환
}
```

### 다국어 설정

```typescript
// src/app/(private)/settings/page.tsx 에 언어 선택 추가
// profiles.language 필드 업데이트
// ko / en / ja / zh 지원
```

---

## 파트 D: Pinecone 마이그레이션 (벡터 100만+ 시)

```typescript
// src/lib/vector/pinecone.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index('ou-sentences');

export async function upsertVector(id: string, values: number[], metadata: any) {
  await index.upsert([{ id, values, metadata }]);
}

export async function queryVector(values: number[], topK = 10) {
  return index.query({ vector: values, topK, includeMetadata: true });
}
```

```bash
pnpm add @pinecone-database/pinecone
```

환경변수:
```env
PINECONE_API_KEY=
PINECONE_INDEX=ou-sentences
```

---

## 파트 E: Neon 마이그레이션 (Supabase DB 분리)

```bash
# 마이그레이션 시점: DB 비용 최적화 필요할 때
# PostgreSQL 표준 사용했으므로 쿼리 변경 없음

# 1. Neon 프로젝트 생성
# 2. pg_dump from Supabase
# 3. pg_restore to Neon
# 4. .env.local DATABASE_URL 교체
# 5. Supabase는 Auth만 유지
```

---

## 완료 체크리스트

```
파트 A — .ou 포맷:
[ ] .ou 파일 익스포트 동작
[ ] .ou 파일 임포트 → DataNode 복원
[ ] OUFileViewer 렌더링

파트 B — 그래프뷰 게임:
[ ] 테마 선택 (우주/미니멀/페이퍼/다크글로우)
[ ] 중력 파라미터 슬라이더
[ ] 스킨 마켓 (/market/skins)
[ ] Stripe 결제 → 스킨 언락

파트 C — 글로벌:
[ ] 언어 설정 (ko/en/ja/zh)
[ ] DataNode 렌더링 시 언어 자동 적용

파트 D — Pinecone (조건부):
[ ] 벡터 100만 초과 시 Pinecone 전환

파트 E — Neon (조건부):
[ ] DB 비용 임계값 도달 시 마이그레이션

[ ] pnpm build 통과
[ ] git commit: "feat: Phase 4 - .ou 포맷 + 그래프뷰 게임 + 글로벌"
```

---

## OU 개발 완료

Phase 0 ~ 4 전체 완료 후:
```
✅ 랜딩 + 인증
✅ OU-Chat + DataNode 파이프라인
✅ DataView 시스템 (뷰 레지스트리)
✅ PixiJS 그래프뷰 60fps
✅ 정확도 높이기
✅ 관리자 패널
✅ 파일 업로드 + R2
✅ Pro 구독 + Stripe
✅ 그룹 + AI 뷰 생성기
✅ 검증 에이전트 + 임베딩
✅ SNS 채널 (피드 + 프로필)
✅ OU 채팅 (DataView 메시지)
✅ 크리에이터 마켓플레이스
✅ B2B 교육 Team 플랜
✅ .ou 파일 포맷
✅ 그래프뷰 게임 생태계
✅ 글로벌 언어 중립 렌더링
```
