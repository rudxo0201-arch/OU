'use client';

import { useState, useMemo } from 'react';
import {
  Storefront, Eye, Users, Check, X,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { getUserRank } from '@/lib/utils/rank';

interface MarketItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  view_type?: string;
  price_krw: number;
  purchase_count: number;
  created_at?: string;
  profiles?: {
    display_name?: string;
    avatar_url?: string;
    handle?: string;
  } | null;
  /** node count of the creator, for rank display */
  creator_node_count?: number;
}

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'study', label: '학습' },
  { id: 'schedule', label: '일정' },
  { id: 'finance', label: '가계부' },
  { id: 'habit', label: '습관' },
  { id: 'work', label: '업무' },
  { id: 'creative', label: '창작' },
];

type SortMode = 'popular' | 'latest';

export function MarketClient({ items }: { items: MarketItem[] }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('popular');
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);

  const filteredItems = useMemo(() => {
    let result = selectedCategory === 'all'
      ? items
      : items.filter(item => item.category === selectedCategory);

    if (sortMode === 'latest') {
      result = [...result].sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    } else {
      result = [...result].sort((a, b) => b.purchase_count - a.purchase_count);
    }

    return result;
  }, [items, selectedCategory, sortMode]);

  const handleSubscribe = async (item: MarketItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (subscribedIds.has(item.id)) {
      // Unsubscribe
      setSubscribingId(item.id);
      try {
        const res = await fetch('/api/views/subscribe', {
          method: 'DELETE',
          body: JSON.stringify({ itemId: item.id }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.status === 401) {
          router.push('/login?next=/market');
          return;
        }
        if (res.ok) {
          setSubscribedIds(prev => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          setNotification(`"${item.name}" 구독을 취소했어요.`);
          setTimeout(() => setNotification(null), 3000);
        }
      } catch {
        // silently fail
      } finally {
        setSubscribingId(null);
      }
      return;
    }

    setSubscribingId(item.id);
    try {
      const res = await fetch('/api/views/subscribe', {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.status === 401) {
        router.push('/login?next=/market');
        return;
      }
      if (res.ok) {
        setSubscribedIds(prev => new Set(prev).add(item.id));
        setNotification(`"${item.name}" 구독 완료!`);
        setTimeout(() => setNotification(null), 3000);
      }
    } catch {
      // silently fail
    } finally {
      setSubscribingId(null);
    }
  };

  const creatorRank = (item: MarketItem) => {
    return getUserRank(item.creator_node_count ?? 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      {notification && (
        <div
          style={{
            position: 'fixed', top: 20, right: 20, zIndex: 1000, maxWidth: 320,
            padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
            display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Check size={16} />
          <span style={{ fontSize: 14, flex: 1 }}>{notification}</span>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div>
        <h2 style={{ margin: 0 }}>마켓</h2>
        <span style={{ color: 'var(--color-dimmed)', fontSize: 14 }}>다른 사용자들이 만든 보기 방식을 둘러보세요</span>
      </div>

      {/* Categories + Sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 24,
                border: '0.5px solid var(--color-default-border)',
                background: selectedCategory === cat.id ? '#374151' : 'transparent',
                color: selectedCategory === cat.id ? '#fff' : 'var(--color-dimmed)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: selectedCategory === cat.id ? 600 : 400,
                transition: 'background 150ms',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 0, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
          {[{ label: '인기순', value: 'popular' }, { label: '최신순', value: 'latest' }].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortMode(opt.value as SortMode)}
              style={{
                padding: '4px 12px', border: 'none', fontSize: 12, cursor: 'pointer',
                background: sortMode === opt.value ? '#e5e7eb' : '#fff',
                fontWeight: sortMode === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Storefront size={48} weight="light" color="#9ca3af" />
            <span style={{ fontWeight: 600 }}>아직 등록된 보기 방식이 없어요</span>
            <span style={{ fontSize: 14, color: 'var(--color-dimmed)', textAlign: 'center' }}>
              {selectedCategory !== 'all'
                ? '다른 카테고리를 확인해보세요.'
                : '곧 다양한 보기 방식이 추가될 예정이에요.'
              }
            </span>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', cursor: 'pointer', fontSize: 14 }}
              >
                전체 보기
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            style={{ padding: 20, display: 'flex', flexDirection: 'column', cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: 8 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {/* Preview placeholder */}
              <div
                style={{
                  height: 120,
                  background: '#f9fafb',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Eye size={28} weight="light" color="#9ca3af" />
              </div>

              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
              <span style={{ fontSize: 14, color: 'var(--color-dimmed)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
                {item.description}
              </span>

              {/* Creator info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, overflow: 'hidden',
                  }}
                >
                  {item.profiles?.avatar_url
                    ? <img src={item.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (item.profiles?.display_name ?? '?')[0]
                  }
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-dimmed)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.profiles?.display_name ?? '익명'}
                </span>
                <span style={{ fontSize: 10 }}>{creatorRank(item).emoji}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={12} weight="light" color="#9ca3af" />
                  <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>{item.purchase_count}명 구독 중</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>
                  {item.price_krw === 0 ? '무료' : `${item.price_krw.toLocaleString()}원`}
                </span>
                <button
                  disabled={subscribingId === item.id}
                  onClick={(e) => handleSubscribe(item, e)}
                  style={{
                    padding: '4px 12px', borderRadius: 6, border: '1px solid #e5e7eb',
                    background: subscribedIds.has(item.id) ? 'transparent' : '#f3f4f6',
                    cursor: 'pointer', fontSize: 12,
                    opacity: subscribingId === item.id ? 0.5 : 1,
                  }}
                >
                  {subscribingId === item.id ? '...' : subscribedIds.has(item.id) ? '구독 취소' : '구독하기'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Link to skins */}
      <div
        onClick={() => router.push('/market/skins')}
        style={{ padding: 20, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: 8 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14, display: 'block' }}>내 우주 꾸미기</span>
            <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>테마와 스킨으로 나만의 우주를 만들어보세요</span>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#6b7280' }}>
            둘러보기
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{selectedItem.name}</h3>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Preview area */}
              <div
                style={{
                  padding: 16, background: '#f9fafb', borderRadius: 8, minHeight: 180,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 }}>
                  <Eye size={32} weight="light" color="#9ca3af" />
                  <span style={{ fontSize: 12, color: 'var(--color-dimmed)', textAlign: 'center' }}>
                    {selectedItem.view_type
                      ? `${selectedItem.view_type} 형태로 데이터를 보여줍니다`
                      : '이 보기 방식의 미리보기'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-dimmed)', textAlign: 'center', maxWidth: 300 }}>
                    구독하면 내 데이터에 이 보기 방식을 적용할 수 있어요
                  </span>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <span style={{ fontSize: 12, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>설명</span>
                  <span style={{ fontSize: 14, lineHeight: 1.7 }}>{selectedItem.description}</span>
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: 0 }} />

              {/* Creator info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#e5e7eb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, overflow: 'hidden',
                    }}
                  >
                    {selectedItem.profiles?.avatar_url
                      ? <img src={selectedItem.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (selectedItem.profiles?.display_name ?? '?')[0]
                    }
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>
                        {selectedItem.profiles?.display_name ?? '익명'}
                      </span>
                      <span style={{ fontSize: 12 }}>{creatorRank(selectedItem).emoji}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-dimmed)' }}>{creatorRank(selectedItem).name}</span>
                    </div>
                    {selectedItem.profiles?.handle && (
                      <span
                        style={{ fontSize: 12, color: 'var(--color-dimmed)', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedItem(null);
                          router.push(`/profile/${selectedItem.profiles?.handle}`);
                        }}
                      >
                        @{selectedItem.profiles.handle}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedItem.purchase_count}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-dimmed)' }}>구독자</span>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: 0 }} />

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, padding: '4px 12px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>
                  {selectedItem.price_krw === 0 ? '무료' : `${selectedItem.price_krw.toLocaleString()}원`}
                </span>
                <button
                  disabled={subscribingId === selectedItem.id}
                  onClick={() => handleSubscribe(selectedItem)}
                  style={{
                    padding: '10px 24px', borderRadius: 6,
                    border: subscribedIds.has(selectedItem.id) ? '1px solid #e5e7eb' : 'none',
                    background: subscribedIds.has(selectedItem.id) ? 'transparent' : '#6b7280',
                    color: subscribedIds.has(selectedItem.id) ? '#1a1a1a' : '#fff',
                    cursor: 'pointer', fontSize: 14,
                    opacity: subscribingId === selectedItem.id ? 0.5 : 1,
                  }}
                >
                  {subscribingId === selectedItem.id ? '...' : subscribedIds.has(selectedItem.id) ? '구독 취소' : '구독하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
