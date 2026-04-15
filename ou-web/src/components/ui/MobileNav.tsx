'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { UnstyledButton, Text, Stack } from '@mantine/core';
import {
  ChatTeardrop, Planet, Newspaper, ChatCircle,
  DotsThree, Target, Storefront, Gear, Crown,
  SignOut, SignIn, UsersThree, MagnifyingGlass, Lightning
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import classes from './MobileNav.module.css';

const MAIN_TABS = [
  { id: 'chat',     label: 'Chat',   icon: ChatTeardrop,  href: '/chat',     isPrivate: true  },
  { id: 'my',       label: '내 우주', icon: Planet,        href: '/my',       isPrivate: true  },
  { id: 'feed',     label: '피드',   icon: Newspaper,     href: '/feed',     isPrivate: true  },
  { id: 'messages', label: '메시지', icon: ChatCircle,    href: '/messages', isPrivate: true  },
];

const MORE_ITEMS = [
  { id: 'search',   label: '검색',         icon: MagnifyingGlass, href: '/search',   isPrivate: true  },
  { id: 'accuracy', label: '정확도 높이기', icon: Target,     href: '/accuracy', isPrivate: true  },
  { id: 'market',   label: '마켓',         icon: Storefront, href: '/market',   isPrivate: false },
  { id: 'groups',      label: '그룹',         icon: UsersThree, href: '/groups',      isPrivate: true  },
  { id: 'automations', label: '자동화',       icon: Lightning,  href: '/automations', isPrivate: true  },
  { id: 'settings',    label: '설정',         icon: Gear,       href: '/settings',    isPrivate: true  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isAdmin } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  /** Auth gate: non-logged-in users go to /login for private routes */
  const navigate = (href: string, isPrivate = true) => {
    if (isPrivate && !user) {
      router.push('/login');
    } else {
      router.push(href);
    }
    setMoreOpen(false);
  };

  return (
    <>
      {/* 오버레이 */}
      {moreOpen && (
        <div className={classes.overlay} onClick={() => setMoreOpen(false)} />
      )}

      {/* 더보기 메뉴 */}
      {moreOpen && (
        <div className={classes.moreMenu}>
          {MORE_ITEMS.map(item => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <UnstyledButton
                key={item.id}
                className={classes.moreItem}
                data-active={active || undefined}
                onClick={() => navigate(item.href, item.isPrivate)}
              >
                <Icon size={20} weight={active ? 'fill' : 'light'} style={{ marginRight: 12 }} />
                <Text fz="sm">{item.label}</Text>
              </UnstyledButton>
            );
          })}

          {isAdmin && (
            <UnstyledButton
              className={classes.moreItem}
              data-active={pathname.startsWith('/admin') || undefined}
              onClick={() => navigate('/admin', true)}
            >
              <Crown size={20} weight={pathname.startsWith('/admin') ? 'fill' : 'light'} style={{ marginRight: 12 }} />
              <Text fz="sm">관리자</Text>
            </UnstyledButton>
          )}

          <UnstyledButton
            className={classes.moreItem}
            onClick={() => {
              if (user) {
                signOut();
              } else {
                navigate('/login', false);
              }
              setMoreOpen(false);
            }}
          >
            {user
              ? <SignOut size={20} weight="light" style={{ marginRight: 12 }} />
              : <SignIn size={20} weight="light" style={{ marginRight: 12 }} />
            }
            <Text fz="sm">{user ? '로그아웃' : '로그인'}</Text>
          </UnstyledButton>
        </div>
      )}

      {/* 하단 탭 바 */}
      <div className={classes.bottomBar}>
        {MAIN_TABS.map(tab => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <UnstyledButton
              key={tab.id}
              className={classes.tabButton}
              data-active={active || undefined}
              onClick={() => navigate(tab.href, tab.isPrivate)}
            >
              <Stack gap={2} align="center">
                <Icon size={22} weight={active ? 'fill' : 'light'} />
                <Text fz={10}>{tab.label}</Text>
              </Stack>
            </UnstyledButton>
          );
        })}

        {/* 더보기 탭 */}
        <UnstyledButton
          className={classes.tabButton}
          data-active={moreOpen || undefined}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <Stack gap={2} align="center">
            <DotsThree size={22} weight={moreOpen ? 'fill' : 'light'} />
            <Text fz={10}>더보기</Text>
          </Stack>
        </UnstyledButton>
      </div>
    </>
  );
}
