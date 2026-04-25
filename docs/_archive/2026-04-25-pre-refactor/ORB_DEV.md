# Orb 개발 가이드 + 체크리스트

> 새 Orb를 만들 때마다 이 파일을 참조한다.
> `pnpm check-orb <slug> [domain]` 으로 자동 검증 가능.

---

## 빠른 검증

```bash
pnpm check-orb babylog care    # slug + domain 전부 검사
pnpm check-orb settings        # Orb 등록만 검사
```

---

## 체크리스트

### A. 신규 도메인 추가 시 (4파일 동시 수정)

- [ ] **추출 config 생성**: `src/lib/pipeline/extraction/domains/{domain}.ts`
  - `requiredFields` 최소화 — 짧은 입력도 저장돼야 함
  - `entities: []` 명시 (불필요한 person 엔티티 중복 방지)
  - 한국어 terse 입력 예시 8개 이상

- [ ] **추출 registry 등록**: `src/lib/pipeline/extraction/registry.ts`
  ```ts
  import { config as {domain}Config } from './domains/{domain}';
  // EXTRACTION_REGISTRY 에 추가
  ```

- [ ] **classifier 등록**: `src/lib/pipeline/classifier.ts`
  - `VIEW_HINT_MAP` 에 `{domain}: '...'` 추가
  - 프롬프트 도메인 목록 (`- {domain}: ...`) 추가

- [ ] **타입 추가**: `src/types/index.ts`
  - `DataNodeDomain` 유니온에 `| '{domain}'` 추가

> ⚠️ 하나라도 빠지면 모든 입력이 `knowledge` 도메인으로 silently 분류됨.

---

### B. Supabase — 신규 테이블 생성 시 (3단계 필수)

```sql
-- 1. 테이블 생성
CREATE TABLE {table} (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  ...
  created_at timestamptz default now()
);

-- 2. RLS 활성화 + 정책 (순서 중요)
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY "{table}_owner" ON {table}
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. authenticated 롤 권한 부여 (이것 없으면 anon key로 접근 불가 → 500)
GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO authenticated;
```

> ⚠️ GRANT 없이 RLS만 걸면 `authenticated` 롤이 테이블에 접근 자체를 못 함.
> RLS는 행 수준, GRANT는 테이블 수준. 둘 다 필요.

---

### C. Orb 등록 (4곳 동시)

- [ ] **Orb registry**: `src/components/orb/registry.ts`
  ```ts
  {slug}: { slug: '{slug}', title: '...', icon: '...', domain: '{domain}', ... }
  ```

- [ ] **OrbGrid**: `src/components/home/OrbGrid.tsx`
  ```ts
  DEFAULT_ORBS: [..., { slug: '{slug}', label: '...', icon: '...' }]
  ```

- [ ] **DockBar**: `src/components/home/DockBar.tsx`
  ```ts
  ORB_ICONS: { ..., {slug}: '...' }
  ORB_LABELS: { ..., {slug}: '...' }
  ```

- [ ] **STANDALONE_ORBS** (커스텀 뷰 Orb인 경우): `src/app/(apps)/orb/[slug]/page.tsx`
  ```ts
  const STANDALONE_ORBS = { ..., {slug}: '/{slug}' }
  ```

---

### D. 라우트 + 컴포넌트

- [ ] **Standalone route**: `src/app/(apps)/{slug}/page.tsx`
- [ ] **메인 View 컴포넌트**: `src/components/orb/views/{PascalSlug}View.tsx`

---

### E. 컴포넌트 패턴 규칙

#### ✅ 데이터 로딩은 최상위에서
```tsx
// ✅ 올바름 — BabyLogView (최상위)에서 로딩
export function BabyLogView() {
  const { setSubjects, setLoaded, loaded } = useCareSubjectsStore();
  useEffect(() => {
    fetch('/api/care/subjects').then(...).then(() => setLoaded(true));
  }, []);
  if (!loaded) return <Spinner />;
  ...
  return <BabyQuickBar />;  // 이미 loaded=true 보장
}

// ❌ 잘못됨 — 자식 컴포넌트에서 loaded 설정
// BabyQuickBar 안에서 setLoaded(true) 하면,
// BabyLogView가 !loaded → null 리턴 → BabyQuickBar 미렌더 → loaded 영원히 false
```

#### ✅ API 실패 시 사용자 피드백 필수
```tsx
const res = await fetch('/api/quick', {...});
const json = await res.json();
if (res.ok && json.ok) {
  showToast('기록됐어요');
} else {
  showToast('저장 실패 — 다시 시도해주세요');  // 반드시 있어야 함
  console.error('[QuickBar] failed:', json);
}
```

#### ✅ Realtime 구독 패턴 (TaskWidget 기준)
```tsx
// 1. Supabase Realtime
useEffect(() => {
  const supabase = createClient();
  const channel = supabase
    .channel(`{orb}-{eventType}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'data_nodes', filter: `domain=eq.{domain}` }, fetchData)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [fetchData]);

// 2. ou-node-created 이벤트 (Realtime 지연 보완)
useEffect(() => {
  const handler = (e: Event) => {
    if ((e as CustomEvent).detail?.domain === '{domain}') fetchData();
  };
  window.addEventListener('ou-node-created', handler);
  return () => window.removeEventListener('ou-node-created', handler);
}, [fetchData]);
```

---

### F. 빌드 확인

```bash
pnpm build    # 타입 에러 없음 확인 필수
```

> ⚠️ 린터/autoformat이 registry.ts를 가끔 빈 파일로 만듦.
> 빌드 에러 `File is not a module` 발생 시 registry.ts 내용 확인.

---

## Lessons Learned (BabyLog 개발 중 발생한 실수)

| 증상 | 원인 | 해결 |
|------|------|------|
| 페이지 blank | `loaded` 설정 코드가 자식 컴포넌트 안에 있었음 | 최상위 컴포넌트로 이동 |
| API 500 | Supabase GRANT 누락 | `GRANT ... TO authenticated` 실행 |
| 도메인 misclassify | classifier.ts 또는 registry.ts 중 하나 누락 | 4파일 동시 수정 |
| `File is not a module` | 린터가 registry.ts를 빈 파일로 만듦 | 빌드 후 파일 크기 확인 |
| 저장 됐는데 위젯 업데이트 안 됨 | `ou-node-created` 이벤트 미발송 | Quick 제출 성공 후 dispatch |
| 저장 실패인데 사용자가 모름 | 에러 토스트 없음 | else 분기 필수 |
