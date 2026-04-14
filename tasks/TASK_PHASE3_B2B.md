# 작업 지시서 — Phase 3 Step 3: B2B 교육 Team 플랜

> 선행 조건: TASK_PHASE3_MESSAGES_MARKET.md 완료
> 완료 기준: Team 플랜 그룹 + 관리자 대시보드 + 학생 구독 동작

---

## 사전 읽기

```
BUSINESS.md    B2B 교육 (학교/학원 Team 플랜, 학생 유입)
PLATFORM.md    그룹 시스템, 구독 뷰
```

---

## 구현 목록

```
[ ] Team 플랜 그룹 생성 (학교/학원 단위)
[ ] 관리자 대시보드 (학생 성취도 리포트뷰)
[ ] 강사 DataNode → 강의뷰 구독 배포
[ ] 학생 오답 DataNode 자동 생성
[ ] 취약점 그래프뷰
[ ] B2B 문의 페이지 /b2b
```

---

## Step 1. B2B 랜딩 페이지

### `src/app/(public)/b2b/page.tsx`

```typescript
'use client';

import { Stack, Title, Text, SimpleGrid, Paper, Button, List } from '@mantine/core';
import { Check } from '@phosphor-icons/react';

export default function B2BPage() {
  const features = [
    '강의 DataNode 구독 배포',
    '학생 성취도 리포트뷰',
    '공동 과제 칸반',
    '오답 DataNode 자동 생성',
    '취약점 그래프뷰',
    '언어 중립 렌더링 (글로벌)',
  ];

  return (
    <Stack gap="xl" maw={900} mx="auto" p="xl">
      <Stack gap="md" ta="center">
        <Title order={1}>학교/학원을 위한 OU Team</Title>
        <Text c="dimmed" fz="lg">
          강의자료가 살아있는 DataNode가 됩니다.
          학생들은 항상 최신 자료를 구독하고,
          교사는 성취도를 한눈에 파악합니다.
        </Text>
        <Button size="lg" w={200} mx="auto">도입 문의하기</Button>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {features.map(f => (
          <Paper key={f} p="md">
            <List icon={<Check size={16} />}>
              <List.Item><Text fz="sm">{f}</Text></List.Item>
            </List>
          </Paper>
        ))}
      </SimpleGrid>

      {/* 교육 시나리오 */}
      <Stack gap="md">
        <Title order={3}>시나리오: 한의대 학년 그룹</Title>
        <Paper p="md">
          <Text fz="sm" c="dimmed">기존 방식</Text>
          <Text fz="sm">과대 → 시간표 이미지 카톡 공지 → 학생들 저장 → 못 찾음 → 반복</Text>
        </Paper>
        <Paper p="md">
          <Text fz="sm" c="dimmed">OU Team</Text>
          <Text fz="sm">과대 → 시간표 DataNode 수정 1번 → 학생 50명 자동 업데이트</Text>
        </Paper>
      </Stack>
    </Stack>
  );
}
```

---

## Step 2. 교사 강의뷰 배포

```typescript
// 강사가 DataNode 구축 → 강의뷰 설정 → 구독 링크 배포
// 수강생: 구독 → 항상 최신
// 수강생이 노트 DataNode 추가 → 강의 + 내 노트 = 하나의 우주

// src/app/(private)/teach/page.tsx
// 강의 DataNode 관리 + 뷰 발행 + 구독자 목록
```

---

## Step 3. 학생 성취도 대시보드

```typescript
// src/app/(private)/groups/[groupId]/dashboard/page.tsx
// 그룹 내 학생들의 DataNode 통계
// 퀴즈 정답률, 오답 패턴, 학습 빈도
// 학부모용 리포트뷰 PDF 익스포트
```

---

## 완료 체크리스트

```
[ ] /b2b 랜딩 페이지
[ ] Team 플랜 그룹 생성 + 학생 초대
[ ] 강의뷰 구독 배포 동작
[ ] 학생 오답 → DataNode 자동 생성
[ ] 관리자 성취도 대시보드
[ ] pnpm build 통과
[ ] git commit: "feat: B2B 교육 Team 플랜"
```
