# 작업 지시서 — Phase 1 Step 2: AppShell + Sidebar

> 선행 조건: TASK_PHASE1_AUTH.md 완료
> 완료 기준: 모든 라우트에서 Sidebar/BottomTab 정상 렌더링

---

## 사전 읽기

```
CLAUDE.md
/ou-frontend/SKILL.md  섹션 3(디자인 토큰), 4(레이아웃), 6(컴포넌트)
FRONTEND_DESIGN.md     레이아웃 구조, Sidebar 명세
ou-design-system/ui-components/Sidebar.tsx      → 수정 후 재사용
ou-design-system/ui-components/AppShell.tsx     → 수정 후 재사용
ou-design-system/ui-components/MobileNav.tsx    → 수정 후 재사용
ou-design-system/css-modules/Sidebar.module.css → 재사용
ou-design-system/css-modules/AppShell.module.css → 재사용
ou-design-system/css-modules/MobileNav.module.css → 재사용
```

---

## 구현 목록

```
[ ] AppShell 레이아웃 (데스크톱 + 모바일)
[ ] Sidebar (OU 라우트로 교체)
[ ] MobileNav (BottomTab, OU 라우트로 교체)
[ ] 저장된 뷰 아이콘 슬롯 (빈 상태)
[ ] 다크/라이트 토글
[ ] 로그인/로그아웃 버튼
[ ] 관리자 전용 메뉴 조건부 표시
```

---

## Step 1. CSS 모듈 복사

```bash
# ou-design-system에서 src/components/ui/ 로 복사
cp ou-design-system/css-modules/Sidebar.module.css    src/components/ui/
cp ou-design-system/css-modules/AppShell.module.css   src/components/ui/
cp ou-design-system/css-modules/MobileNav.module.css  src/components/ui/
cp ou-design-system/css-modules/WorkspaceLayout.module.css src/components/ui/
```

---

## Step 2. Sidebar

### `src/components/ui/Sidebar.tsx`

ou-design-system/ui-components/Sidebar.tsx를 기반으로 네비게이션 항목만 OU 라우트로 교체:

```typescript
'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Stack, Tooltip, UnstyledButton, Text, Box,
  Divider, ActionIcon, Group
} from '@mantine/core';
import {
  ChatTeardrop, Planet, Target, Rss,
  ChatCircle, Gear, SignIn, SignOut,
  Moon, Sun, CaretLeft, CaretRight, Crown
} from '@phosphor-icons/react';
import { useMantineColorScheme } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationStore } from '@/stores/navigationStore';
import classes from './Sidebar.module.css';

// OU 네비게이션 구조 (CLAUDE.md 라우트 불변)
const NAV_ITEMS = [
  { id: 'chat',     label: 'Chat',         icon: ChatTeardrop, href: '/chat'     },
  { id: 'my',       label: '내 우주',       icon: Planet,       href: '/my'       },
  { id: 'accuracy', label: '정확도 높이기',  icon: Target,       href: '/accuracy' },
  // Phase 3
  // { id: 'feed',  label: 'SNS',    icon: Rss,         href: '/feed'     },
  // { id: 'messages', label: '채팅', icon: ChatCircle,  href: '/messages' },
] as const;

const ADMIN_ITEM = { id: 'admin', label: '관리자', icon: Crown, href: '/admin' };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { collapsed, toggleCollapsed, savedViews } = useNavigationStore();

  const NavButton = ({ item }: { item: typeof NAV_ITEMS[number] }) => {
    const active = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Tooltip label={item.label} position="right" disabled={!collapsed}>
        <UnstyledButton
          className={classes.navButton}
          data-active={active || undefined}
          onClick={() => router.push(item.href)}
        >
          <Icon size={22} weight={active ? 'fill' : 'light'} />
          {!collapsed && <Text fz="sm">{item.label}</Text>}
        </UnstyledButton>
      </Tooltip>
    );
  };

  return (
    <Box className={classes.sidebar} data-collapsed={collapsed || undefined}>
      <Stack h="100%" gap={0}>
        {/* 로고 */}
        <Box className={classes.logo} onClick={() => router.push('/my')}>
          <Text ff="Orbitron, monospace" fw={700} fz={collapsed ? 16 : 20}>
            {collapsed ? 'O' : 'OU'}
          </Text>
        </Box>

        <Divider />

        {/* 메인 네비게이션 */}
        <Stack gap={4} p="xs" flex={1}>
          {NAV_ITEMS.map(item => <NavButton key={item.id} item={item} />)}

          {/* 저장된 뷰 슬롯 (빈 상태 — ViewRenderer에서 채워짐) */}
          <Divider my={4} />
          {savedViews.map(view => (
            <Tooltip key={view.id} label={view.name} position="right" disabled={!collapsed}>
              <UnstyledButton
                className={classes.navButton}
                data-active={pathname === `/view/${view.id}` || undefined}
                onClick={() => router.push(`/view/${view.id}`)}
              >
                <Text fz={20}>{view.icon || '◆'}</Text>
                {!collapsed && <Text fz="sm" truncate>{view.name}</Text>}
              </UnstyledButton>
            </Tooltip>
          ))}
        </Stack>

        {/* 하단 영역 */}
        <Stack gap={4} p="xs">
          {/* 관리자 메뉴 (조건부) */}
          {/* isAdmin 체크는 useAuth 훅에 추가 필요 */}

          {/* 다크/라이트 토글 */}
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => toggleColorScheme()}
          >
            {colorScheme === 'dark'
              ? <Sun size={20} weight="light" />
              : <Moon size={20} weight="light" />
            }
          </ActionIcon>

          {/* 설정 */}
          <Tooltip label="설정" position="right" disabled={!collapsed}>
            <UnstyledButton
              className={classes.navButton}
              onClick={() => router.push('/settings')}
            >
              <Gear size={22} weight="light" />
              {!collapsed && <Text fz="sm">설정</Text>}
            </UnstyledButton>
          </Tooltip>

          {/* 로그인/로그아웃 */}
          <Tooltip
            label={user ? '로그아웃' : '로그인'}
            position="right"
            disabled={!collapsed}
          >
            <UnstyledButton
              className={classes.navButton}
              onClick={() => user ? signOut() : router.push('/login')}
            >
              {user
                ? <SignOut size={22} weight="light" />
                : <SignIn size={22} weight="light" />
              }
              {!collapsed && <Text fz="sm">{user ? '로그아웃' : '로그인'}</Text>}
            </UnstyledButton>
          </Tooltip>

          {/* 사이드바 접기/펼치기 */}
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={toggleCollapsed}
            mt={4}
          >
            {collapsed
              ? <CaretRight size={16} weight="light" />
              : <CaretLeft size={16} weight="light" />
            }
          </ActionIcon>
        </Stack>
      </Stack>
    </Box>
  );
}
```

---

## Step 3. MobileNav (BottomTab)

### `src/components/ui/MobileNav.tsx`

ou-design-system/ui-components/MobileNav.tsx 기반, 탭 항목만 교체:

```typescript
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Group, UnstyledButton, Text, Stack } from '@mantine/core';
import { ChatTeardrop, Planet, Target, DotsThree } from '@phosphor-icons/react';
import classes from './MobileNav.module.css';

const MAIN_TABS = [
  { id: 'chat',     label: 'Chat',   icon: ChatTeardrop, href: '/chat'     },
  { id: 'my',       label: '내 우주', icon: Planet,       href: '/my'       },
  { id: 'accuracy', label: '정확도',  icon: Target,       href: '/accuracy' },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Group className={classes.mobileNav} grow>
      {MAIN_TABS.map(tab => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <UnstyledButton
            key={tab.id}
            className={classes.tab}
            data-active={active || undefined}
            onClick={() => router.push(tab.href)}
          >
            <Stack gap={2} align="center">
              <Icon size={22} weight={active ? 'fill' : 'light'} />
              <Text fz={10}>{tab.label}</Text>
            </Stack>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}
```

---

## Step 4. AppShell

### `src/components/ui/OUAppShell.tsx`

```typescript
'use client';

import { AppShell, Box } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useNavigationStore } from '@/stores/navigationStore';
import classes from './AppShell.module.css';

interface OUAppShellProps {
  children: React.ReactNode;
}

export function OUAppShell({ children }: OUAppShellProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { collapsed } = useNavigationStore();

  if (isMobile) {
    return (
      <Box className={classes.mobileLayout}>
        <Box className={classes.mobileContent}>{children}</Box>
        <MobileNav />
      </Box>
    );
  }

  return (
    <AppShell
      navbar={{
        width: collapsed ? 60 : 220,
        breakpoint: 'sm',
      }}
      padding={0}
    >
      <AppShell.Navbar>
        <Sidebar />
      </AppShell.Navbar>
      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
```

---

## Step 5. Zustand 네비게이션 스토어

### `src/stores/navigationStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SavedView {
  id: string;
  name: string;
  icon?: string;
  viewType: string;
}

interface NavigationStore {
  collapsed: boolean;
  savedViews: SavedView[];
  toggleCollapsed: () => void;
  addSavedView: (view: SavedView) => void;
  removeSavedView: (id: string) => void;
}

export const useNavigationStore = create<NavigationStore>()(
  persist(
    set => ({
      collapsed: false,
      savedViews: [],
      toggleCollapsed: () => set(s => ({ collapsed: !s.collapsed })),
      addSavedView: view =>
        set(s => ({ savedViews: [...s.savedViews, view] })),
      removeSavedView: id =>
        set(s => ({ savedViews: s.savedViews.filter(v => v.id !== id) })),
    }),
    { name: 'ou-navigation' }
  )
);
```

---

## Step 6. Private 라우트에 AppShell 적용

### `src/app/(private)/layout.tsx`

```typescript
import { OUAppShell } from '@/components/ui/OUAppShell';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  return <OUAppShell>{children}</OUAppShell>;
}
```

---

## Step 7. /chat, /my, /accuracy 플레이스홀더 업데이트

각 페이지를 기본 레이아웃으로 업데이트:

```typescript
// src/app/(private)/my/page.tsx
import { Box, Text } from '@mantine/core';
export default function MyPage() {
  return (
    <Box p="xl">
      <Text fz="xl" fw={600}>내 우주</Text>
      <Text c="dimmed">GraphView 구현 예정</Text>
    </Box>
  );
}
```

---

## 완료 체크리스트

```
[ ] 데스크톱: Sidebar 렌더링 + 라우트 이동
[ ] 모바일: BottomTab 렌더링 + 라우트 이동
[ ] Sidebar 접기/펼치기 (60px ↔ 220px)
[ ] 활성 라우트 fill 아이콘 표시
[ ] 다크/라이트 토글 동작
[ ] 로그아웃 동작
[ ] 비로그인 로그인 버튼 → /login 이동 (disabled 아님)
[ ] navigationStore persist 동작 (새로고침 후 collapsed 상태 유지)
[ ] pnpm build 통과
[ ] git commit: "feat: AppShell + Sidebar + MobileNav 구현"
```

---

## 다음 작업

**TASK_PHASE1_CHAT.md** → OU-Chat 핵심 구현
