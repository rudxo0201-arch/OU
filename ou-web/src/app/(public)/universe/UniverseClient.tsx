'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Planet, MagnifyingGlass, Sparkle, Lightning, GraduationCap,
  Question, ChatCircleDots, Robot, Eye, Camera, ShareNetwork,
  UsersThree, Star, CheckCircle,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PublicNode {
  id: string;
  title?: string;
  domain: string;
  importance?: number;
  created_at: string;
  raw?: string;
  user_id: string;
  domain_data?: Record<string, any>;
  profiles?: { display_name?: string; handle?: string } | null;
}

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  knowledge: '지식',
  idea: '아이디어',
  relation: '관계',
  emotion: '감정',
  finance: '가계부',
  habit: '습관',
  product: '기능',
  education: '활용법',
};

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'AI 대화': <ChatCircleDots size={20} weight="light" />,
  '자동 정리': <Robot size={20} weight="light" />,
  '다양한 보기': <Eye size={20} weight="light" />,
  '이미지 인식': <Camera size={20} weight="light" />,
  '공유하기': <ShareNetwork size={20} weight="light" />,
  '그룹': <UsersThree size={20} weight="light" />,
};

interface UniverseClientProps {
  initialNodes: PublicNode[];
  activeDomains: string[];
  introNodes: PublicNode[];
  featureNodes: PublicNode[];
  usecaseNodes: PublicNode[];
  faqNodes: PublicNode[];
  scenarioNodes: PublicNode[];
}

export function UniverseClient({
  initialNodes,
  activeDomains,
  introNodes,
  featureNodes,
  usecaseNodes,
  faqNodes,
  scenarioNodes,
}: UniverseClientProps) {
  const router = useRouter();
  const [nodes, setNodes] = useState(initialNodes);
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialNodes.length >= 30);
  const observerRef = useRef<HTMLDivElement | null>(null);

  // Realization modal state
  const [realizeModalOpen, setRealizeModalOpen] = useState(false);
  const [realizeTarget, setRealizeTarget] = useState<PublicNode | null>(null);
  const [realizeStory, setRealizeStory] = useState('');
  const [realizeSubmitting, setRealizeSubmitting] = useState(false);

  // Realization counts per scenario
  const [realizeCounts, setRealizeCounts] = useState<Record<string, number>>({});

  const hasAdminContent =
    introNodes.length > 0 ||
    featureNodes.length > 0 ||
    usecaseNodes.length > 0 ||
    faqNodes.length > 0 ||
    scenarioNodes.length > 0;

  // Fetch realization counts for all scenarios
  useEffect(() => {
    if (scenarioNodes.length === 0) return;
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        scenarioNodes.map(async (node) => {
          try {
            const res = await fetch(`/api/social/realize?scenarioId=${node.id}`);
            if (res.ok) {
              const data = await res.json();
              counts[node.id] = data.count ?? 0;
            }
          } catch {
            counts[node.id] = 0;
          }
        })
      );
      setRealizeCounts(counts);
    };
    fetchCounts();
  }, [scenarioNodes]);

  // Filter by search and domain
  const filtered = nodes.filter(node => {
    const matchesDomain = !selectedDomain || node.domain === selectedDomain;
    const matchesSearch = !search ||
      (node.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (node.raw ?? '').toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  // Load more
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/universe/browse?page=${page + 1}&limit=30`);
      if (res.ok) {
        const { nodes: moreNodes } = await res.json();
        if (moreNodes && moreNodes.length > 0) {
          setNodes(prev => [...prev, ...moreNodes]);
          setPage(p => p + 1);
          if (moreNodes.length < 30) setHasMore(false);
        } else {
          setHasMore(false);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const domainTabs = activeDomains.map(d => ({
    id: d,
    label: DOMAIN_LABELS[d] ?? d,
  }));

  const openRealizeModal = (node: PublicNode) => {
    setRealizeTarget(node);
    setRealizeStory('');
    setRealizeModalOpen(true);
  };

  const submitRealization = async () => {
    if (!realizeTarget || !realizeStory.trim()) return;

    setRealizeSubmitting(true);
    try {
      const res = await fetch('/api/social/realize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioNodeId: realizeTarget.id,
          story: realizeStory.trim(),
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.ok) {
        setRealizeModalOpen(false);
        setRealizeCounts(prev => ({
          ...prev,
          [realizeTarget.id]: (prev[realizeTarget.id] ?? 0) + 1,
        }));
        alert('이야기가 공유되었어요!');
      } else {
        const data = await res.json();
        alert(data.error || '공유에 실패했어요. 다시 시도해주세요.');
      }
    } catch {
      alert('공유에 실패했어요. 다시 시도해주세요.');
    } finally {
      setRealizeSubmitting(false);
    }
  };

  /* ── Shared card style ── */
  const cardStyle: React.CSSProperties = {
    background: 'transparent',
    border: '0.5px solid var(--ou-border-subtle)',
    borderRadius: 'var(--ou-radius-card)',
    boxShadow: 'var(--ou-glow-sm)',
    transition: 'box-shadow var(--ou-transition), border-color var(--ou-transition)',
  };
  const cardHoverProps = {
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.boxShadow = 'var(--ou-glow-hover)';
      e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.boxShadow = 'var(--ou-glow-sm)';
      e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
    },
  };

  /* ── Section title style ── */
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: 'var(--ou-text-dimmed)',
    fontWeight: 500,
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'transparent' }}>
      {/* Hero Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 24px' }}>
        <Planet size={36} weight="thin" style={{ color: 'var(--ou-text-dimmed)' }} />
        <h2 style={{ fontWeight: 600, color: 'var(--ou-text-strong)', margin: 0 }}>
          OU Universe
        </h2>
        <span style={{ fontSize: 14, color: 'var(--ou-text-dimmed)' }}>
          모두가 공유한 기록들
        </span>
      </div>

      {/* ── Admin: OU 소개 Section ── */}
      {introNodes.length > 0 && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <Sparkle size={14} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={sectionTitleStyle}>OU 소개</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {introNodes.map(node => (
              <div
                key={node.id}
                style={{ ...cardStyle, padding: 20 }}
                {...cardHoverProps}
              >
                <span style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ou-text-strong)', display: 'block' }}>
                  {node.title}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ou-text-body)' }}>
                  {node.raw}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin: 기능 Section ── */}
      {featureNodes.length > 0 && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <Lightning size={14} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={sectionTitleStyle}>기능</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {featureNodes.map(node => (
              <div
                key={node.id}
                style={{ ...cardStyle, padding: 16 }}
                {...cardHoverProps}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--ou-surface-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--ou-text-dimmed)',
                  }}>
                    {FEATURE_ICONS[node.title ?? ''] ?? <Lightning size={14} weight="light" />}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ou-text-strong)' }}>
                    {node.title}
                  </span>
                </div>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ou-text-body)' }}>
                  {node.raw}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin: 활용법 Section ── */}
      {usecaseNodes.length > 0 && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <GraduationCap size={14} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={sectionTitleStyle}>활용법</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {usecaseNodes.map(node => (
              <div
                key={node.id}
                style={{ ...cardStyle, padding: 16 }}
                {...cardHoverProps}
              >
                <span style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--ou-text-strong)', display: 'block' }}>
                  {node.title}
                </span>
                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ou-text-body)' }}>
                  {node.raw}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Scenario Section ── */}
      {scenarioNodes.length > 0 && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <Star size={14} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={sectionTitleStyle}>이런 경험, 해보셨나요?</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scenarioNodes.map(node => (
              <div
                key={node.id}
                style={{ ...cardStyle, padding: 20 }}
                {...cardHoverProps}
              >
                <Link
                  href={`/scenario/${node.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}
                >
                  <span style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ou-text-strong)', display: 'block' }}>
                    {node.title}
                  </span>
                  <p style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--ou-text-body)',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    margin: 0,
                  }}>
                    {node.raw}
                  </p>
                </Link>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, alignItems: 'center' }}>
                  {(realizeCounts[node.id] ?? 0) > 0 ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <CheckCircle size={14} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
                      <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                        {realizeCounts[node.id]}명 실현
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openRealizeModal(node);
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--ou-radius-pill)',
                      borderWidth: '0.5px',
                      borderStyle: 'solid',
                      borderColor: 'var(--ou-border-subtle)',
                      background: 'transparent',
                      color: 'var(--ou-text-body)',
                      fontSize: 12,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    나도 이랬어요!
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Admin: FAQ Section ── */}
      {faqNodes.length > 0 && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <Question size={14} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={sectionTitleStyle}>자주 묻는 질문</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {faqNodes.map(node => (
              <details
                key={node.id}
                style={{
                  ...cardStyle,
                  padding: 0,
                }}
              >
                <summary style={{
                  padding: 16,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14,
                  color: 'var(--ou-text-strong)',
                  listStyle: 'none',
                }}>
                  {node.title}
                </summary>
                <div style={{ padding: '0 16px 16px' }}>
                  <span style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ou-text-body)' }}>
                    {node.raw}
                  </span>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* ── Divider between admin content and community ── */}
      {hasAdminContent && (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--ou-border-subtle)' }} />
            <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>공유된 기록들</span>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--ou-border-subtle)' }} />
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <MagnifyingGlass size={16} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
          </div>
          <input
            placeholder="검색어를 입력하세요..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              border: '0.5px solid var(--ou-border-subtle)',
              backgroundColor: 'transparent',
              color: 'var(--ou-text-body)',
              boxShadow: 'var(--ou-glow-xs)',
              transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
              borderRadius: 'var(--ou-radius-pill)',
              padding: '12px 14px 12px 40px',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Domain filter tabs - pill-block toggles */}
      {domainTabs.length > 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '0 24px', marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedDomain(null)}
            style={{
              borderRadius: 'var(--ou-radius-pill)',
              border: `0.5px solid ${selectedDomain === null ? 'var(--ou-border-hover)' : 'var(--ou-border-subtle)'}`,
              background: selectedDomain === null ? 'var(--ou-surface-muted)' : 'transparent',
              boxShadow: selectedDomain === null ? 'var(--ou-glow-sm)' : 'none',
              transition: 'all var(--ou-transition)',
              padding: '6px 14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: selectedDomain === null ? 600 : 400,
              color: selectedDomain === null ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
            }}
          >
            전체
          </button>
          {domainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedDomain(tab.id)}
              style={{
                borderRadius: 'var(--ou-radius-pill)',
                border: `0.5px solid ${selectedDomain === tab.id ? 'var(--ou-border-hover)' : 'var(--ou-border-subtle)'}`,
                background: selectedDomain === tab.id ? 'var(--ou-surface-muted)' : 'transparent',
                boxShadow: selectedDomain === tab.id ? 'var(--ou-glow-sm)' : 'none',
                transition: 'all var(--ou-transition)',
                padding: '6px 14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: selectedDomain === tab.id ? 600 : 400,
                color: selectedDomain === tab.id ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Community Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 24px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Planet size={48} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
              <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>
                {search || selectedDomain ? '검색 결과가 없어요' : '아직 공유된 내용이 없어요'}
              </span>
              <span style={{ fontSize: 14, textAlign: 'center', color: 'var(--ou-text-dimmed)' }}>
                {search || selectedDomain
                  ? '다른 검색어나 카테고리를 시도해보세요.'
                  : '대화를 시작하고 내 기록을 공개해보세요.'}
              </span>
              {(search || selectedDomain) ? (
                <button
                  onClick={() => { setSearch(''); setSelectedDomain(null); }}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--ou-radius-pill)',
                    borderWidth: '0.5px',
                    borderStyle: 'solid',
                    borderColor: 'var(--ou-border-subtle)',
                    background: 'transparent',
                    color: 'var(--ou-text-body)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  전체 보기
                </button>
              ) : (
                <Link
                  href="/login"
                  style={{
                    display: 'inline-block',
                    padding: '8px 20px',
                    borderRadius: 'var(--ou-radius-pill)',
                    background: 'rgba(255,255,255,0.9)',
                    color: '#111',
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  시작하기
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(node => (
              <Link
                key={node.id}
                href={`/view/${node.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'block',
                  padding: 16,
                  background: 'transparent',
                  border: '0.5px solid var(--ou-border-subtle)',
                  borderRadius: 'var(--ou-radius-card)',
                  boxShadow: 'var(--ou-glow-sm)',
                  transition: 'box-shadow var(--ou-transition), border-color var(--ou-transition)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 500,
                    flex: 1,
                    color: 'var(--ou-text-strong)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {node.title || (node.raw ? node.raw.slice(0, 60) : node.id)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      background: 'var(--ou-surface-muted)',
                      border: '0.5px solid var(--ou-border-subtle)',
                      borderRadius: 'var(--ou-radius-pill)',
                      color: 'var(--ou-text-dimmed)',
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {DOMAIN_LABELS[node.domain] ?? node.domain}
                  </span>
                </div>
                {node.raw && node.title && (
                  <p style={{
                    fontSize: 12,
                    marginBottom: 4,
                    color: 'var(--ou-text-body)',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    margin: '0 0 4px 0',
                  }}>
                    {node.raw}
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span
                    style={{ fontSize: 12, textDecoration: 'none', color: 'var(--ou-text-dimmed)' }}
                  >
                    {node.profiles?.display_name ?? '익명'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                    {new Date(node.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </Link>
            ))}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={observerRef} style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                {loading && <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>...</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Realization Modal ── */}
      {realizeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setRealizeModalOpen(false);
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 500,
              background: 'var(--ou-space)',
              border: '0.5px solid var(--ou-border-subtle)',
              boxShadow: 'var(--ou-glow-lg)',
              borderRadius: 'var(--ou-radius-card)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>나도 이랬어요!</span>
              <button onClick={() => setRealizeModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ou-text-dimmed)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>&times;</button>
            </div>
            {realizeTarget && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Quoted scenario */}
                <div
                  style={{
                    padding: 16,
                    background: 'var(--ou-surface-subtle)',
                    borderRadius: 'var(--ou-radius-md)',
                    border: '0.5px solid var(--ou-border-faint)',
                  }}
                >
                  <span style={{ fontSize: 12, marginBottom: 4, color: 'var(--ou-text-dimmed)', display: 'block' }}>
                    {realizeTarget.title}
                  </span>
                  <p style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--ou-text-body)',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    margin: 0,
                  }}>
                    {realizeTarget.raw}
                  </p>
                </div>

                <textarea
                  placeholder="당신의 이야기를 들려주세요"
                  value={realizeStory}
                  onChange={e => setRealizeStory(e.target.value)}
                  rows={4}
                  style={{
                    border: '0.5px solid var(--ou-border-subtle)',
                    background: 'transparent',
                    color: 'var(--ou-text-body)',
                    padding: '10px 14px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    borderRadius: 'var(--ou-radius-card)',
                    outline: 'none',
                    resize: 'vertical',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />

                <button
                  onClick={submitRealization}
                  disabled={realizeSubmitting || !realizeStory.trim()}
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
                    cursor: realizeSubmitting || !realizeStory.trim() ? 'not-allowed' : 'pointer',
                    opacity: realizeSubmitting || !realizeStory.trim() ? 0.4 : 1,
                  }}
                >
                  공유하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
