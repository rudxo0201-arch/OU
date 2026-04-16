'use client';

import { useState, useMemo } from 'react';
import {
  User, Eye, EyeSlash, Planet, IdentificationCard, UsersThree,
} from '@phosphor-icons/react';

interface ProfileViewProps {
  nodes: any[];
  filters?: Record<string, any>;
}

export function ProfileView({ nodes }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const profileData = useMemo(() => {
    const profileNode = nodes.find(n => n.domain_data?.type === 'profile');
    const dd = profileNode?.domain_data ?? {};
    return {
      displayName: dd.display_name ?? dd.name ?? '이름 없음',
      handle: dd.handle ?? '',
      bio: dd.bio ?? '',
      avatarUrl: dd.avatar_url ?? null,
      personas: dd.personas ?? [],
    };
  }, [nodes]);

  const domainStats = useMemo(() => {
    const stats = new Map<string, number>();
    for (const n of nodes) {
      if (n.domain && n.domain !== 'unresolved') {
        stats.set(n.domain, (stats.get(n.domain) ?? 0) + 1);
      }
    }
    return Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({ domain, count }));
  }, [nodes]);

  const publicNodes = useMemo(() => nodes.filter(n => n.visibility === 'public'), [nodes]);
  const totalNodes = nodes.length;

  const tabs = [
    { value: 'overview', label: '개요', icon: <IdentificationCard size={14} /> },
    { value: 'public', label: '공개 데이터', icon: <Eye size={14} /> },
    ...(profileData.personas.length > 0 ? [{ value: 'personas', label: '페르소나', icon: <UsersThree size={14} /> }] : []),
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Profile header */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '0.5px solid var(--ou-border, #333)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          {profileData.avatarUrl ? (
            <img src={profileData.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={28} weight="light" />
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 18 }}>{profileData.displayName}</span>
          {profileData.handle && (
            <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>@{profileData.handle}</span>
          )}
          {profileData.bio && (
            <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{profileData.bio}</span>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Planet size={14} weight="light" />
              <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{totalNodes} Planet</span>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Eye size={14} weight="light" />
              <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{publicNodes.length} 공개</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--ou-border, #333)', marginBottom: 16 }}>
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 12,
              color: activeTab === tab.value ? 'inherit' : 'var(--ou-text-dimmed, #888)',
              borderBottom: activeTab === tab.value ? '2px solid currentColor' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-dimmed, #888)', textTransform: 'uppercase' }}>도메인별 데이터</span>
          {domainStats.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {domainStats.map(({ domain, count }) => (
                <div
                  key={domain}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: '0.5px solid var(--ou-border, #333)',
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{DOMAIN_LABELS[domain] ?? domain}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)' }}>아직 데이터가 없습니다</span>
          )}
        </div>
      )}

      {/* Public data */}
      {activeTab === 'public' && (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {publicNodes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {publicNodes.map(node => (
                <div
                  key={node.id}
                  style={{
                    display: 'flex',
                    padding: '8px 16px',
                    gap: 12,
                    alignItems: 'center',
                    border: '0.5px solid var(--ou-border, #333)',
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>{node.domain ?? '-'}</span>
                  <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.domain_data?.title ?? node.raw?.slice(0, 60) ?? '(제목 없음)'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>
                    {node.created_at ? new Date(node.created_at).toLocaleDateString('ko-KR') : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0' }}>
              <EyeSlash size={48} weight="light" style={{ color: 'var(--ou-gray-5, #888)' }} />
              <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)', marginTop: 8 }}>공개된 데이터가 없습니다</span>
            </div>
          )}
        </div>
      )}

      {/* Personas */}
      {activeTab === 'personas' && profileData.personas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {profileData.personas.map((persona: any, idx: number) => (
            <div
              key={idx}
              style={{
                padding: 16,
                border: '0.5px solid var(--ou-border, #333)',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '0.5px solid var(--ou-border, #333)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                  {persona.display_name?.[0] ?? '?'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{persona.display_name ?? '페르소나'}</span>
                  {persona.handle && (
                    <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>@{persona.handle}</span>
                  )}
                </div>
                <span style={{ fontSize: 10, marginLeft: 'auto', padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4 }}>
                  {persona.visibility === 'public' ? '공개' : '비공개'}
                </span>
              </div>
              {persona.bio && (
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{persona.bio}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  habit: '습관',
  knowledge: '지식',
  idea: '아이디어',
  relation: '관계',
  emotion: '감정',
  finance: '가계',
  product: '상품',
  broadcast: '방송',
  education: '교육',
  media: '미디어',
  location: '장소',
};
