'use client';

import { useState } from 'react';
import {
  CheckCircle, Heart, Copy, Check, ArrowLeft,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ScenarioNode {
  id: string;
  title?: string;
  raw?: string;
  created_at: string;
  user_id: string;
  domain_data?: Record<string, any>;
  profiles?: { display_name?: string; handle?: string } | null;
}

interface RealizationNode {
  id: string;
  title?: string;
  raw?: string;
  created_at: string;
  user_id: string;
  domain_data?: Record<string, any>;
  profiles?: { id?: string; display_name?: string; avatar_url?: string; handle?: string } | null;
}

interface ScenarioDetailClientProps {
  scenario: ScenarioNode;
  initialRealizations: RealizationNode[];
}

export function ScenarioDetailClient({
  scenario,
  initialRealizations,
}: ScenarioDetailClientProps) {
  const router = useRouter();
  const [realizations, setRealizations] = useState(initialRealizations);
  const [story, setStory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [linkCopied, setLinkCopied] = useState(false);

  const handleSubmit = async () => {
    if (!story.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/social/realize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioNodeId: scenario.id,
          story: story.trim(),
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        // Add to top of list optimistically
        setRealizations(prev => [{
          id: data.node.id,
          title: data.node.title,
          raw: story.trim(),
          created_at: data.node.created_at ?? new Date().toISOString(),
          user_id: '',
          profiles: { display_name: '나', avatar_url: undefined },
        }, ...prev]);
        setStory('');
        alert('이야기가 공유되었어요!');
      } else {
        const data = await res.json();
        alert(data.error || '공유에 실패했어요. 다시 시도해주세요.');
      }
    } catch {
      alert('공유에 실패했어요. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (nodeId: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    await fetch('/api/social/like', {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handleCopyLink = () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/scenario/${scenario.id}`
      : `/scenario/${scenario.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {});
  };

  /* ── Shared styles ── */
  const cardStyle: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--ou-border-subtle)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'var(--ou-glow-sm)',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: 'var(--ou-text-dimmed)',
    fontWeight: 500,
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px', background: 'transparent' }}>
      {/* Back button — pill-block */}
      <Link
        href="/universe"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--ou-text-dimmed)',
          textDecoration: 'none',
          fontSize: 12,
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={14} />
        돌아가기
      </Link>

      {/* Scenario Content — floating-block */}
      <div
        style={{
          ...cardStyle,
          boxShadow: 'var(--ou-glow-md)',
          padding: 24,
          marginBottom: 20,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 20, marginBottom: 12, color: 'var(--ou-text-strong)', display: 'block' }}>
          {scenario.title}
        </span>
        <span style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ou-text-body)' }}>
          {scenario.raw}
        </span>

        <div style={{ borderTop: '0.5px solid var(--ou-border-faint)', margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <CheckCircle size={16} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-body)' }}>
              {realizations.length}명이 실현했어요
            </span>
          </div>
          {/* Share — pill-block */}
          <button
            onClick={handleCopyLink}
            title={linkCopied ? '복사됨' : '링크 복사'}
            style={{
              background: 'transparent',
              border: '0.5px solid var(--ou-border-subtle)',
              borderRadius: 'var(--ou-radius-pill)',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {linkCopied ? <Check size={16} /> : <Copy size={16} weight="light" />}
          </button>
        </div>
      </div>

      {/* Write your story */}
      <div
        style={{ ...cardStyle, padding: 20, marginBottom: 28 }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--ou-text-strong)', display: 'block' }}>
          나도 이랬어요!
        </span>
        <textarea
          placeholder="당신의 이야기를 들려주세요"
          value={story}
          onChange={e => setStory(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            border: '0.5px solid var(--ou-border-subtle)',
            background: 'transparent',
            color: 'var(--ou-text-body)',
            padding: '10px 14px',
            fontSize: 14,
            fontFamily: 'inherit',
            borderRadius: 'var(--ou-radius-card)',
            outline: 'none',
            resize: 'vertical',
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />
        {/* CTA button — filled style */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !story.trim()}
          style={{
            width: '100%',
            padding: '10px 20px',
            borderRadius: 'var(--ou-radius-pill)',
            background: 'rgba(255,255,255,0.9)',
            color: '#111',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: submitting || !story.trim() ? 'not-allowed' : 'pointer',
            opacity: submitting || !story.trim() ? 0.4 : 1,
          }}
        >
          공유하기
        </button>
      </div>

      {/* Realizations Feed */}
      {realizations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ ...sectionTitleStyle, marginBottom: 8 }}>
            실현 이야기
          </span>
          {realizations.map(r => (
            <div
              key={r.id}
              style={{ ...cardStyle, padding: 16 }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {r.profiles?.handle ? (
                  <Link
                    href={`/profile/${r.profiles.handle}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '0.5px solid var(--ou-border-subtle)',
                      overflow: 'hidden',
                      background: 'var(--ou-surface-muted)',
                      flexShrink: 0,
                    }}>
                      {r.profiles?.avatar_url && (
                        <img src={r.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-strong)', display: 'block' }}>
                        {r.profiles?.display_name ?? '익명'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      border: '0.5px solid var(--ou-border-subtle)',
                      overflow: 'hidden',
                      background: 'var(--ou-surface-muted)',
                      flexShrink: 0,
                    }}>
                      {r.profiles?.avatar_url && (
                        <img src={r.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-strong)', display: 'block' }}>
                        {r.profiles?.display_name ?? '익명'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                        {new Date(r.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ou-text-body)', display: 'block', marginBottom: 12 }}>
                {r.raw}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => handleLike(r.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Heart
                    size={16}
                    weight={likedIds.has(r.id) ? 'fill' : 'light'}
                    style={{ color: likedIds.has(r.id) ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)' }}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
