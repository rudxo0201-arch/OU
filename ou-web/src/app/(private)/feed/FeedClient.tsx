'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, ChatCircle, ArrowsClockwise, PaperPlaneTilt, Rss, CheckCircle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdBanner } from '@/components/ui/AdBanner';
import { createClient } from '@/lib/supabase/client';

interface FeedNode {
  id: string;
  domain: string;
  raw?: string;
  title?: string;
  created_at: string;
  like_count?: number;
  comment_count?: number;
  domain_data?: Record<string, any>;
  profiles?: { id?: string; display_name?: string; avatar_url?: string } | null;
  author_handle?: string | null;
  user_id?: string;
}

type FeedTab = 'following' | 'discover';

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task: '할 일',
  knowledge: '지식',
  idea: '아이디어',
  relation: '관계',
  emotion: '감정',
  finance: '가계부',
  habit: '습관',
};

export function FeedClient({ nodes, userId }: { nodes: FeedNode[]; userId?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState<FeedTab>(nodes.length > 0 ? 'following' : 'discover');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    nodes.forEach(n => { map[n.id] = n.like_count ?? 0; });
    return map;
  });
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Real-time new posts
  const [newPosts, setNewPosts] = useState<FeedNode[]>([]);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const displayedNodeIds = useRef(new Set(nodes.map(n => n.id)));

  // Subscribe to new public data_nodes in real-time
  useEffect(() => {
    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'data_nodes',
        filter: 'visibility=eq.public',
      }, async (payload) => {
        const newNode = payload.new as FeedNode & { user_id?: string; visibility?: string };

        // Skip own posts
        if (userId && newNode.user_id === userId) return;

        // Skip if already displayed
        if (displayedNodeIds.current.has(newNode.id)) return;

        // Fetch the author profile
        let profile: { id?: string; display_name?: string; avatar_url?: string } | null = null;
        if (newNode.user_id) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', newNode.user_id)
            .single();
          profile = p;
        }

        const enrichedNode: FeedNode = {
          ...newNode,
          profiles: profile,
          like_count: 0,
          comment_count: 0,
          author_handle: null,
        };

        setNewPosts(prev => [enrichedNode, ...prev]);
        setShowNewBanner(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const showNewPosts = () => {
    // Update displayed IDs set
    newPosts.forEach(p => displayedNodeIds.current.add(p.id));
    // Prepend new posts to the displayed list
    setAllNodes(prev => [...newPosts, ...prev]);
    setNewPosts([]);
    setShowNewBanner(false);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Merged node list (initial SSR + newly loaded)
  const [allNodes, setAllNodes] = useState<FeedNode[]>(nodes);

  const handleLike = async (nodeId: string) => {
    const wasLiked = likedIds.has(nodeId);
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    setLikeCounts(prev => ({
      ...prev,
      [nodeId]: (prev[nodeId] ?? 0) + (wasLiked ? -1 : 1),
    }));
    await fetch('/api/social/like', {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const handleComment = async (nodeId: string) => {
    if (!commentText.trim()) return;
    await fetch('/api/social/comment', {
      method: 'POST',
      body: JSON.stringify({ nodeId, text: commentText }),
      headers: { 'Content-Type': 'application/json' },
    });
    setCommentText('');
    setCommentOpenId(null);
  };

  // Show discover content when following tab is empty
  const displayNodes = tab === 'following' && allNodes.length === 0
    ? [] // will show empty state
    : allNodes; // In real app, discover tab would fetch different data

  const renderEmptyState = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Rss size={48} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
        <span style={{ fontWeight: 600, fontSize: 18, color: 'var(--ou-text-strong)' }}>
          {tab === 'following'
            ? '팔로우한 사람의 새로운 소식이 없어요'
            : '아직 공유된 내용이 없어요'
          }
        </span>
        <span style={{ fontSize: 14, textAlign: 'center', color: 'var(--ou-text-dimmed)' }}>
          {tab === 'following'
            ? '다른 사용자를 팔로우해서 피드를 채워보세요.'
            : '대화를 시작하고 내 기록을 공개해보세요.'
          }
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          {tab === 'following' && (
            <button
              onClick={() => setTab('discover')}
              style={{
                background: 'transparent',
                border: '0.5px solid var(--ou-border-subtle)',
                borderRadius: 'var(--ou-radius-pill)',
                color: 'var(--ou-text-body)',
                padding: '8px 16px',
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              추천 둘러보기
            </button>
          )}
          <button
            onClick={() => router.push('/chat')}
            style={{
              background: 'none',
              border: 'none',
              borderRadius: 'var(--ou-radius-pill)',
              color: 'var(--ou-text-dimmed)',
              padding: '8px 16px',
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            대화 시작하기
          </button>
        </div>
      </div>
    </div>
  );

  /* pill-block tab style */
  const tabStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: 'var(--ou-radius-pill)',
    background: active ? 'var(--ou-surface-hover)' : 'transparent',
    border: active ? '0.5px solid var(--ou-border-muted)' : '0.5px solid transparent',
    boxShadow: active ? 'var(--ou-glow-xs)' : 'none',
    transition: 'all var(--ou-transition)',
    padding: '4px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '0 auto', padding: 24 }}>
      {/* Header with tabs — pill-block toggles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--ou-text-heading)',
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          FEED
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setTab('following')}
            style={{ ...tabStyle(tab === 'following'), background: tab === 'following' ? 'var(--ou-surface-hover)' : 'transparent' }}
          >
            <span style={{ fontSize: 14, fontWeight: tab === 'following' ? 600 : 400, color: tab === 'following' ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)' }}>
              팔로잉
            </span>
          </button>
          <button
            onClick={() => setTab('discover')}
            style={{ ...tabStyle(tab === 'discover'), background: tab === 'discover' ? 'var(--ou-surface-hover)' : 'transparent' }}
          >
            <span style={{ fontSize: 14, fontWeight: tab === 'discover' ? 600 : 400, color: tab === 'discover' ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)' }}>
              추천
            </span>
          </button>
        </div>
      </div>

      {/* New posts banner — pill-block */}
      {showNewBanner && newPosts.length > 0 && (
        <button
          onClick={showNewPosts}
          style={{
            textAlign: 'center',
            padding: '8px 16px',
            borderRadius: 'var(--ou-radius-pill)',
            background: 'var(--ou-surface-subtle)',
            border: '0.5px solid var(--ou-border-subtle)',
            boxShadow: 'var(--ou-glow-sm)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-body)' }}>
            새 글 {newPosts.length}개
          </span>
        </button>
      )}

      {displayNodes.length === 0 ? renderEmptyState() : (
        <>
          {displayNodes.map((node, i) => (
            <div key={node.id}>
              {/* card-block style feed item */}
              <div
                style={{
                  padding: 16,
                  background: 'transparent',
                  border: '0.5px solid var(--ou-border-subtle)',
                  borderRadius: 'var(--ou-radius-card)',
                  boxShadow: 'var(--ou-glow-sm)',
                  transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
                }}
              >
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button
                    onClick={() => {
                      if (node.author_handle) {
                        router.push(`/profile/${node.author_handle}`);
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: node.author_handle ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit' }}
                  >
                    {/* orb-block avatar */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        border: '0.5px solid var(--ou-border-muted)',
                        boxShadow: 'var(--ou-glow-xs)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'var(--ou-surface-muted)',
                      }}
                    >
                      {node.profiles?.avatar_url && (
                        <img src={node.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-strong)', display: 'block' }}>
                        {node.profiles?.display_name ?? '익명'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                        {new Date(node.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </button>
                  {/* badge-block domain */}
                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 8px',
                      borderRadius: 'var(--ou-radius-pill)',
                      border: '0.5px solid var(--ou-border-subtle)',
                      color: 'var(--ou-text-dimmed)',
                      background: 'transparent',
                      fontSize: 10,
                      alignSelf: 'flex-start',
                    }}
                  >
                    {DOMAIN_LABELS[node.domain] ?? node.domain}
                  </span>
                </div>

                {/* Realization context banner */}
                {node.domain_data?.type === 'realization' && node.domain_data?.scenario_title && (
                  <Link
                    href={`/scenario/${node.domain_data.scenario_node_id}`}
                    style={{
                      display: 'block',
                      padding: '6px 10px',
                      background: 'var(--ou-surface-faint)',
                      borderRadius: 'var(--ou-radius-sm)',
                      border: '0.5px solid var(--ou-border-faint)',
                      textDecoration: 'none',
                      color: 'inherit',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <CheckCircle size={14} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
                      <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                        {node.profiles?.display_name ?? '익명'}님이 &apos;{node.domain_data.scenario_title}&apos; 시나리오를 실현했어요
                      </span>
                    </div>
                  </Link>
                )}

                {node.title && node.domain_data?.type !== 'realization' && (
                  <span style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--ou-text-strong)', display: 'block' }}>{node.title}</span>
                )}
                <p style={{
                  fontSize: 14,
                  marginBottom: 12,
                  lineHeight: 1.6,
                  color: 'var(--ou-text-body)',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: '0 0 12px 0',
                }}>
                  {node.raw}
                </p>

                <div style={{ borderTop: '0.5px solid var(--ou-border-faint)', marginBottom: 8 }} />

                {/* Action buttons — pill-block.sm */}
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      onClick={() => handleLike(node.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderRadius: 'var(--ou-radius-pill)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Heart size={18} weight={likedIds.has(node.id) ? 'fill' : 'light'} style={{ color: likedIds.has(node.id) ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)' }} />
                    </button>
                    {(likeCounts[node.id] ?? 0) > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{likeCounts[node.id]}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      onClick={() => setCommentOpenId(commentOpenId === node.id ? null : node.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderRadius: 'var(--ou-radius-pill)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <ChatCircle size={18} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
                    </button>
                    {(node.comment_count ?? 0) > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>{node.comment_count}</span>
                    )}
                  </div>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      borderRadius: 'var(--ou-radius-pill)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ArrowsClockwise size={18} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
                  </button>
                </div>

                {commentOpenId === node.id && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <textarea
                      placeholder="댓글을 남겨보세요..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      rows={1}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: '0.5px solid var(--ou-border-subtle)',
                        borderRadius: 'var(--ou-radius-pill)',
                        color: 'var(--ou-text-body)',
                        padding: '6px 12px',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        resize: 'none',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleComment(node.id)}
                      style={{
                        background: 'none',
                        borderRadius: 'var(--ou-radius-pill)',
                        border: '0.5px solid var(--ou-border-subtle)',
                        cursor: commentText.trim() ? 'pointer' : 'default',
                        padding: 8,
                        display: 'flex',
                        alignItems: 'center',
                        opacity: commentText.trim() ? 1 : 0.4,
                        pointerEvents: commentText.trim() ? 'auto' : 'none',
                      }}
                    >
                      <PaperPlaneTilt size={16} style={{ color: 'var(--ou-text-body)' }} />
                    </button>
                  </div>
                )}
              </div>

              {i % 5 === 4 && <AdBanner position="feed" plan="free" />}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
