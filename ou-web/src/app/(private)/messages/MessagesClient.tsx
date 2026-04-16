'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatCircle, PlusCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';

interface OtherMember {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  handle: string | null;
}

interface RoomData {
  id: string;
  name: string | null;
  last_message: string | null;
  updated_at: string | null;
  created_at: string | null;
  other_members: OtherMember[];
  unread_count: number;
}

interface ProfileResult {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

export function MessagesClient({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/rooms');
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Real-time: listen for new messages in any of user's rooms to update list
  useEffect(() => {
    const channel = supabase
      .channel('rooms-list-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const newMsg = payload.new as { room_id: string; content?: string; sender_id: string; created_at: string };
        setRooms(prev => {
          const roomIdx = prev.findIndex(r => r.id === newMsg.room_id);
          if (roomIdx === -1) {
            // Room not in our list; refetch
            fetchRooms();
            return prev;
          }
          const updated = [...prev];
          const room = { ...updated[roomIdx] };
          room.last_message = newMsg.content ?? room.last_message;
          room.updated_at = newMsg.created_at;
          if (newMsg.sender_id !== userId) {
            room.unread_count = (room.unread_count || 0) + 1;
          }
          updated[roomIdx] = room;
          // Re-sort by updated_at descending
          updated.sort((a, b) => {
            const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return tb - ta;
          });
          return updated;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const searchUsers = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', userId)
        .limit(10);
      setResults(data ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const createRoomWithUser = async (targetUserId: string) => {
    setCreating(true);
    try {
      const res = await fetch('/api/messages/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const { roomId } = await res.json();
      if (roomId) {
        setModalOpen(false);
        router.push(`/messages/${roomId}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const openNewChat = () => {
    setQuery('');
    setResults([]);
    setModalOpen(true);
  };

  const getRoomDisplayName = (room: RoomData) => {
    if (room.name) return room.name;
    const other = room.other_members?.[0];
    if (other) return other.display_name || other.handle || '회원';
    return '대화방';
  };

  const getRoomAvatar = (room: RoomData) => {
    const other = room.other_members?.[0];
    return other?.avatar_url ?? undefined;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '어제';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('ko-KR', { weekday: 'short' });
    }
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>...</span>
      </div>
    );
  }

  const renderRoomList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: 'var(--ou-text-heading)',
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          MESSAGES
        </span>
        {/* pill-block create button */}
        <button
          onClick={openNewChat}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-pill)',
            color: 'var(--ou-text-body)',
            boxShadow: 'var(--ou-glow-sm)',
            transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
            padding: '6px 14px',
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
          }}
        >
          <PlusCircle size={16} style={{ color: 'var(--ou-text-body)' }} />
          새 대화
        </button>
      </div>

      {rooms.map(room => (
        /* card-block room item */
        <div
          key={room.id}
          style={{
            cursor: 'pointer',
            padding: 16,
            background: 'transparent',
            border: '0.5px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-card)',
            boxShadow: 'var(--ou-glow-sm)',
            transition: 'border-color var(--ou-transition), box-shadow var(--ou-transition)',
          }}
          onClick={() => router.push(`/messages/${room.id}`)}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-hover)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-hover)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--ou-glow-sm)';
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'nowrap' }}>
            {/* Avatar — 36px circle with border-muted */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '0.5px solid var(--ou-border-muted)',
                boxShadow: 'var(--ou-glow-xs)',
                flexShrink: 0,
                overflow: 'hidden',
                background: 'var(--ou-surface-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getRoomAvatar(room) ? (
                <img src={getRoomAvatar(room)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ChatCircle size={18} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, flexWrap: 'nowrap' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: room.unread_count > 0 ? 700 : 500,
                    color: 'var(--ou-text-strong)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {getRoomDisplayName(room)}
                  </span>
                </div>
                <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                  {formatTime(room.updated_at)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: room.unread_count > 0 ? 500 : 400,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: room.unread_count > 0 ? 'var(--ou-text-body)' : 'var(--ou-text-dimmed)',
                  }}
                >
                  {room.last_message ?? '아직 메시지가 없어요'}
                </span>
                {/* badge-block.count unread */}
                {room.unread_count > 0 && (
                  <div
                    style={{
                      flexShrink: 0,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 'var(--ou-radius-pill)',
                      border: '0.5px solid var(--ou-border-muted)',
                      background: 'var(--ou-surface-hover)',
                      boxShadow: 'var(--ou-glow-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--ou-text-strong)',
                    }}
                  >
                    {room.unread_count > 9 ? '9+' : room.unread_count}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <ChatCircle size={48} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
        <span style={{ fontWeight: 600, fontSize: 18, color: 'var(--ou-text-strong)' }}>아직 대화가 없어요</span>
        <span style={{ fontSize: 14, textAlign: 'center', color: 'var(--ou-text-dimmed)' }}>
          친구를 초대해서 대화를 시작해보세요.
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={openNewChat}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: '0.5px solid var(--ou-border-subtle)',
              borderRadius: 'var(--ou-radius-pill)',
              color: 'var(--ou-text-body)',
              boxShadow: 'var(--ou-glow-sm)',
              padding: '8px 16px',
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <PlusCircle size={18} style={{ color: 'var(--ou-text-body)' }} />
            새 대화 시작하기
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {rooms.length === 0 ? renderEmpty() : renderRoomList()}

      {/* Modal — fixed overlay */}
      {modalOpen && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 440,
              background: 'var(--ou-surface-muted)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '0.5px solid var(--ou-border-subtle)',
              boxShadow: 'var(--ou-glow-lg)',
              borderRadius: 'var(--ou-radius-card)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid var(--ou-border-faint)', paddingBottom: 12, marginBottom: 16 }}>
              <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>새 대화</span>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ou-text-dimmed)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit' }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* input-block search */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <MagnifyingGlass size={16} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
                </div>
                <input
                  placeholder="이름 또는 아이디로 검색"
                  value={query}
                  onChange={(e) => searchUsers(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '0.5px solid var(--ou-border-subtle)',
                    borderRadius: 'var(--ou-radius-pill)',
                    color: 'var(--ou-text-body)',
                    boxShadow: 'var(--ou-glow-sm)',
                    padding: '10px 12px 10px 36px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {searching && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                  <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 13 }}>...</span>
                </div>
              )}

              {!searching && results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {results.map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => createRoomWithUser(profile.id)}
                      disabled={creating}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        padding: '10px 8px',
                        borderRadius: 'var(--ou-radius-card)',
                        border: '0.5px solid transparent',
                        background: 'none',
                        cursor: creating ? 'wait' : 'pointer',
                        transition: 'border-color var(--ou-transition), background var(--ou-transition)',
                        fontFamily: 'inherit',
                        width: '100%',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--ou-border-subtle)';
                        (e.currentTarget as HTMLElement).style.background = 'var(--ou-surface-faint)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
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
                        {profile.avatar_url && (
                          <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-strong)', display: 'block' }}>
                          {profile.display_name || profile.handle}
                        </span>
                        {profile.handle && (
                          <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>@{profile.handle}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searching && query.length >= 2 && results.length === 0 && (
                <span style={{ fontSize: 14, textAlign: 'center', padding: 16, color: 'var(--ou-text-dimmed)' }}>
                  검색 결과가 없어요
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
