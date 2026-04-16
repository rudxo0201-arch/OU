'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Target, ChatCircle, UserPlus, UsersThree, FileMagnifyingGlass } from '@phosphor-icons/react';
import { useNotifications, NotificationItem } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';

const TYPE_ICONS: Record<NotificationItem['type'], React.ElementType> = {
  accuracy: Target,
  message: ChatCircle,
  follower: UserPlus,
  group_invite: UsersThree,
  pdf_review: FileMagnifyingGlass,
};

export function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  const [opened, setOpened] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!opened) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpened(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [opened]);

  const handleClick = (href: string) => {
    setOpened(false);
    router.push(href);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell button with indicator */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpened(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ou-text-muted, rgba(255,255,255,0.5))',
            padding: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell size={20} weight={opened ? 'fill' : 'light'} />
        </button>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: 9,
              fontWeight: 700,
              padding: '0 4px',
              minWidth: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              background: 'var(--ou-text-body, #fff)',
              color: 'var(--ou-space, #060810)',
              pointerEvents: 'none',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {opened && (
        <div
          style={{
            position: 'absolute',
            left: '100%',
            top: 0,
            marginLeft: 8,
            width: 320,
            background: 'var(--ou-glass-bg, rgba(20,20,30,0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
            borderRadius: 8,
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 16px', borderBottom: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>알림</span>
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>
                  새로운 알림이 없어요
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(item => {
                  const Icon = TYPE_ICONS[item.type];
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleClick(item.href)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
                        cursor: 'pointer',
                        color: 'inherit',
                        font: 'inherit',
                        padding: '8px 16px',
                        textAlign: 'left',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ marginTop: 2, flexShrink: 0 }}>
                        <Icon size={18} weight="light" />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, display: 'block' }}>{item.title}</span>
                        <span style={{ fontSize: 12, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
