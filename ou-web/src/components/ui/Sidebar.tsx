'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Stack, Tooltip, UnstyledButton, Text, Box,
  ActionIcon
} from '@mantine/core';
import {
  ChatTeardrop, Planet, Target, MagnifyingGlass,
  Gear, SignIn, SignOut,
  Moon, Sun, CaretLeft, CaretRight, Crown,
  Newspaper, ChatCircle, Storefront, UsersThree, Lightning
} from '@phosphor-icons/react';
import { useMantineColorScheme } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useNavigationStore } from '@/stores/navigationStore';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './NotificationBell';
import { RankBadge } from './RankBadge';
import classes from './Sidebar.module.css';

const CORE_NAV = [
  { id: 'chat', label: 'Chat',        icon: ChatTeardrop, href: '/chat' },
  { id: 'my',   label: '내 우주',      icon: Planet,       href: '/my'   },
] as const;

const COMMUNITY_NAV = [
  { id: 'feed',     label: '피드',   icon: Newspaper,   href: '/feed'     },
  { id: 'messages', label: '메시지', icon: ChatCircle,  href: '/messages' },
  { id: 'groups',   label: '그룹',   icon: UsersThree,  href: '/groups'   },
] as const;

const EXPLORE_NAV = [
  { id: 'market',      label: '마켓',   icon: Storefront, href: '/market' },
  { id: 'automations', label: '자동화', icon: Lightning,  href: '/automations' },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isAdmin } = useAuth();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { collapsed, toggleCollapsed, savedViews } = useNavigationStore();
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('unresolved_entities')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('resolution_status', 'pending')
      .then(({ count }) => setUnresolvedCount(count ?? 0));
    supabase
      .from('data_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setNodeCount(count ?? 0));
  }, [user]);

  const expanded = !collapsed;

  /** Auth gate: if not logged in, redirect to /login for private routes */
  const handleNav = (href: string, isPrivate: boolean) => {
    if (isPrivate && !user) {
      router.push('/login');
    } else {
      router.push(href);
    }
  };

  const renderNavItem = (
    item: { id: string; label: string; icon: React.ElementType; href: string },
    badge?: number,
    isPrivate = true
  ) => {
    const active = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Tooltip key={item.id} label={item.label} position="right" disabled={expanded}>
        <UnstyledButton
          className={classes.navButton}
          data-active={active || undefined}
          data-expanded={expanded || undefined}
          onClick={() => handleNav(item.href, isPrivate)}
          style={{ position: 'relative' }}
        >
          <Icon size={22} weight={active ? 'fill' : 'light'} />
          {expanded && <Text fz="sm" ml="xs">{item.label}</Text>}
          {badge != null && badge > 0 && (
            <Box
              style={{
                position: 'absolute',
                top: 4,
                right: collapsed ? 4 : 8,
                background: 'var(--mantine-color-text)',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                color: 'var(--mantine-color-body)',
                fontWeight: 700,
              }}
            >
              {badge > 9 ? '9+' : badge}
            </Box>
          )}
        </UnstyledButton>
      </Tooltip>
    );
  };

  return (
    <Box
      className={classes.sidebar}
      data-expanded={expanded || undefined}
    >
      <Stack h="100%" gap={0}>
        {/* 로고 — 로그인 여부에 따라 /my 또는 / */}
        <Box
          className={classes.brandArea}
          onClick={() => router.push(user ? '/my' : '/')}
          style={{ cursor: 'pointer' }}
        >
          <Text className={classes.brandText} fw={700} fz={collapsed ? 16 : 20}>
            {collapsed ? 'O' : 'OU'}
          </Text>
        </Box>

        {user && (
          <Box px="xs" py={4} style={{ display: 'flex', justifyContent: 'center' }}>
            <NotificationBell />
          </Box>
        )}

        {user && expanded && (
          <Box px="md" py={4}>
            <RankBadge nodeCount={nodeCount} variant="compact" />
          </Box>
        )}

        <Box style={{ height: '0.5px', background: 'var(--ou-border-subtle)' }} />

        {/* 메인 영역 */}
        <Stack gap={4} p="xs" flex={1} style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {/* 검색 */}
          {renderNavItem(
            { id: 'search', label: '검색', icon: MagnifyingGlass, href: '/search' },
            undefined,
            true
          )}

          {/* 코어 */}
          {CORE_NAV.map(item => renderNavItem(item, undefined, true))}

          {/* 정확도 — 항상 표시, 미해결 항목이 있으면 배지 */}
          {renderNavItem(
            { id: 'accuracy', label: '정확도 높이기', icon: Target, href: '/accuracy' },
            unresolvedCount > 0 ? unresolvedCount : undefined,
            true
          )}

          {/* 커뮤니티 — 항상 표시, 비로그인 시 auth gate */}
          {expanded && (
            <Text className={classes.sectionLabel}>커뮤니티</Text>
          )}
          {!expanded && <Box my={4} style={{ height: '0.5px', background: 'var(--ou-border-subtle)' }} />}
          {COMMUNITY_NAV.map(item => renderNavItem(item, undefined, true))}

          {/* 탐색 */}
          {expanded && (
            <Text className={classes.sectionLabel}>탐색</Text>
          )}
          {!expanded && <Box my={4} style={{ height: '0.5px', background: 'var(--ou-border-subtle)' }} />}
          {EXPLORE_NAV.map(item => renderNavItem(item, undefined, false))}

          {/* 저장된 뷰 */}
          {savedViews.length > 0 && (
            <>
              {expanded && (
                <Text className={classes.sectionLabel}>저장된 뷰</Text>
              )}
              {!expanded && <Box my={4} style={{ height: '0.5px', background: 'var(--ou-border-subtle)' }} />}
              {savedViews.map(view => (
                <Tooltip key={view.id} label={view.name} position="right" disabled={expanded}>
                  <UnstyledButton
                    className={classes.navButton}
                    data-active={pathname === `/view/${view.id}` || undefined}
                    data-expanded={expanded || undefined}
                    onClick={() => handleNav(`/view/${view.id}`, true)}
                  >
                    <Text fz={20}>{view.icon ?? '◆'}</Text>
                    {expanded && (
                      <Text fz="sm" ml="xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {view.name}
                      </Text>
                    )}
                  </UnstyledButton>
                </Tooltip>
              ))}
            </>
          )}
        </Stack>

        {/* 하단 영역 */}
        <Stack gap={4} p="xs">
          {isAdmin && (
            <Tooltip label="관리자" position="right" disabled={expanded}>
              <UnstyledButton
                className={classes.navButton}
                data-active={pathname.startsWith('/admin') || undefined}
                data-expanded={expanded || undefined}
                onClick={() => router.push('/admin')}
              >
                <Crown size={22} weight={pathname.startsWith('/admin') ? 'fill' : 'light'} />
                {expanded && <Text fz="sm" ml="xs">관리자</Text>}
              </UnstyledButton>
            </Tooltip>
          )}

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

          <Tooltip label="설정" position="right" disabled={expanded}>
            <UnstyledButton
              className={classes.navButton}
              data-active={pathname.startsWith('/settings') || undefined}
              data-expanded={expanded || undefined}
              onClick={() => handleNav('/settings', true)}
            >
              <Gear size={22} weight={pathname.startsWith('/settings') ? 'fill' : 'light'} />
              {expanded && <Text fz="sm" ml="xs">설정</Text>}
            </UnstyledButton>
          </Tooltip>

          <Tooltip
            label={user ? '로그아웃' : '로그인'}
            position="right"
            disabled={expanded}
          >
            <UnstyledButton
              className={classes.navButton}
              data-expanded={expanded || undefined}
              onClick={() => user ? signOut() : router.push('/login')}
            >
              {user
                ? <SignOut size={22} weight="light" />
                : <SignIn size={22} weight="light" />
              }
              {expanded && <Text fz="sm" ml="xs">{user ? '로그아웃' : '로그인'}</Text>}
            </UnstyledButton>
          </Tooltip>

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
