'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChatTeardrop, Planet, Target, MagnifyingGlass,
  Gear, SignIn, SignOut,
  Moon, Sun, CaretLeft, CaretRight, Crown,
  Newspaper, ChatCircle, Storefront, UsersThree, Lightning
} from '@phosphor-icons/react';
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
      <button
        key={item.id}
        title={expanded ? undefined : item.label}
        className={classes.navButton}
        data-active={active || undefined}
        data-expanded={expanded || undefined}
        onClick={() => handleNav(item.href, isPrivate)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          font: 'inherit',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Icon size={22} weight={active ? 'fill' : 'light'} />
        {expanded && <span style={{ fontSize: 'var(--mantine-font-size-sm, 14px)', marginLeft: 8 }}>{item.label}</span>}
        {badge != null && badge > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: collapsed ? 4 : 8,
              background: 'var(--ou-text-body, #fff)',
              borderRadius: '50%',
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              color: 'var(--ou-space, #060810)',
              fontWeight: 700,
            }}
          >
            {badge > 9 ? '9+' : badge}
          </div>
        )}
      </button>
    );
  };

  return (
    <div
      className={classes.sidebar}
      data-expanded={expanded || undefined}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
        {/* 로고 -- 로그인 여부에 따라 /my 또는 / */}
        <div
          className={classes.brandArea}
          onClick={() => router.push(user ? '/my' : '/')}
          style={{ cursor: 'pointer' }}
        >
          <img
            src="/ou-logo.png"
            alt="OU"
            style={{
              width: collapsed ? 24 : 40,
              height: 'auto',
              objectFit: 'contain',
              transition: 'width 200ms ease',
              filter: 'brightness(0.9)',
            }}
          />
        </div>

        {user && (
          <div style={{ padding: '4px 10px', display: 'flex', justifyContent: 'center' }}>
            <NotificationBell />
          </div>
        )}

        {user && expanded && (
          <div style={{ padding: '4px 16px' }}>
            <RankBadge nodeCount={nodeCount} variant="compact" />
          </div>
        )}

        <div style={{ height: '0.5px', background: 'var(--ou-border-subtle)' }} />

        {/* 메인 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 10, flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {/* 검색 */}
          {renderNavItem(
            { id: 'search', label: '검색', icon: MagnifyingGlass, href: '/search' },
            undefined,
            true
          )}

          {/* 코어 */}
          {CORE_NAV.map(item => renderNavItem(item, undefined, true))}

          {/* 정확도 -- 항상 표시, 미해결 항목이 있으면 배지 */}
          {renderNavItem(
            { id: 'accuracy', label: '정확도 높이기', icon: Target, href: '/accuracy' },
            unresolvedCount > 0 ? unresolvedCount : undefined,
            true
          )}

          {/* 커뮤니티 -- 항상 표시, 비로그인 시 auth gate */}
          {expanded && (
            <span className={classes.sectionLabel}>커뮤니티</span>
          )}
          {!expanded && <div style={{ margin: '4px 0', height: '0.5px', background: 'var(--ou-border-subtle)' }} />}
          {COMMUNITY_NAV.map(item => renderNavItem(item, undefined, true))}

          {/* 탐색 */}
          {expanded && (
            <span className={classes.sectionLabel}>탐색</span>
          )}
          {!expanded && <div style={{ margin: '4px 0', height: '0.5px', background: 'var(--ou-border-subtle)' }} />}
          {EXPLORE_NAV.map(item => renderNavItem(item, undefined, false))}

          {/* 저장된 뷰 */}
          {savedViews.length > 0 && (
            <>
              {expanded && (
                <span className={classes.sectionLabel}>저장된 뷰</span>
              )}
              {!expanded && <div style={{ margin: '4px 0', height: '0.5px', background: 'var(--ou-border-subtle)' }} />}
              {savedViews.map(view => (
                <button
                  key={view.id}
                  title={expanded ? undefined : view.name}
                  className={classes.navButton}
                  data-active={pathname === `/view/${view.id}` || undefined}
                  data-expanded={expanded || undefined}
                  onClick={() => handleNav(`/view/${view.id}`, true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 20 }}>{view.icon ?? '◆'}</span>
                  {expanded && (
                    <span style={{ fontSize: 'var(--mantine-font-size-sm, 14px)', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {view.name}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {/* 하단 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 10 }}>
          {isAdmin && (
            <button
              title={expanded ? undefined : '관리자'}
              className={classes.navButton}
              data-active={pathname.startsWith('/admin') || undefined}
              data-expanded={expanded || undefined}
              onClick={() => router.push('/admin')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <Crown size={22} weight={pathname.startsWith('/admin') ? 'fill' : 'light'} />
              {expanded && <span style={{ fontSize: 'var(--mantine-font-size-sm, 14px)', marginLeft: 8 }}>관리자</span>}
            </button>
          )}

          <button
            onClick={() => {
              // Theme toggle removed - always dark
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ou-text-muted, rgba(255,255,255,0.5))',
              padding: 4,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sun size={20} weight="light" />
          </button>

          <button
            title={expanded ? undefined : '설정'}
            className={classes.navButton}
            data-active={pathname.startsWith('/settings') || undefined}
            data-expanded={expanded || undefined}
            onClick={() => handleNav('/settings', true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <Gear size={22} weight={pathname.startsWith('/settings') ? 'fill' : 'light'} />
            {expanded && <span style={{ fontSize: 'var(--mantine-font-size-sm, 14px)', marginLeft: 8 }}>설정</span>}
          </button>

          <button
            title={expanded ? undefined : (user ? '로그아웃' : '로그인')}
            className={classes.navButton}
            data-expanded={expanded || undefined}
            onClick={() => user ? signOut() : router.push('/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            {user
              ? <SignOut size={22} weight="light" />
              : <SignIn size={22} weight="light" />
            }
            {expanded && <span style={{ fontSize: 'var(--mantine-font-size-sm, 14px)', marginLeft: 8 }}>{user ? '로그아웃' : '로그인'}</span>}
          </button>

          <button
            onClick={toggleCollapsed}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ou-text-muted, rgba(255,255,255,0.5))',
              padding: 4,
              marginTop: 4,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {collapsed
              ? <CaretRight size={16} weight="light" />
              : <CaretLeft size={16} weight="light" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
