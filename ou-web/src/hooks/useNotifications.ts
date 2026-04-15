'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { notifications as mantineNotifications } from '@mantine/notifications';

export interface NotificationItem {
  id: string;
  type: 'accuracy' | 'message' | 'follower' | 'group_invite' | 'pdf_review';
  title: string;
  description: string;
  href: string;
  createdAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef(createClient());

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    const supabase = supabaseRef.current;
    const items: NotificationItem[] = [];

    // 1. Unresolved entities (accuracy items)
    const { count: unresolvedCount } = await supabase
      .from('unresolved_entities')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('resolution_status', 'pending');

    if (unresolvedCount && unresolvedCount > 0) {
      items.push({
        id: 'accuracy',
        type: 'accuracy',
        title: '확인이 필요한 내용',
        description: `${unresolvedCount}개의 내용을 확인해 주세요`,
        href: '/accuracy',
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Unread chat rooms (rooms with messages newer than last seen)
    const { data: myRooms } = await supabase
      .from('chat_room_members')
      .select('room_id, last_read_at, chat_rooms(name, last_message, updated_at)')
      .eq('user_id', user.id)
      .limit(5);

    if (myRooms) {
      for (const room of myRooms) {
        const chatRoom = Array.isArray(room.chat_rooms)
          ? room.chat_rooms[0]
          : room.chat_rooms;
        if (chatRoom?.last_message) {
          const updatedAt = (chatRoom as { updated_at?: string }).updated_at;
          const lastRead = room.last_read_at;
          const isUnread = !lastRead || (updatedAt && new Date(updatedAt) > new Date(lastRead));

          if (isUnread) {
            items.push({
              id: `msg-${room.room_id}`,
              type: 'message',
              title: (chatRoom as { name?: string }).name || '대화방',
              description: chatRoom.last_message as string,
              href: `/messages/${room.room_id}`,
              createdAt: updatedAt || new Date().toISOString(),
            });
          }
        }
      }
    }

    // 3. Recent followers
    const { data: recentFollowers } = await supabase
      .from('persona_follows')
      .select('follower_id, created_at, profiles!persona_follows_follower_id_fkey(display_name, handle)')
      .eq('persona_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentFollowers) {
      for (const f of recentFollowers) {
        const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
        const name = (profile as { display_name?: string; handle?: string })?.display_name
          || (profile as { handle?: string })?.handle
          || '회원';
        items.push({
          id: `follow-${f.follower_id}`,
          type: 'follower',
          title: '새 팔로워',
          description: `${name}님이 팔로우했습니다`,
          href: `/profile/${(profile as { handle?: string })?.handle || ''}`,
          createdAt: f.created_at as string,
        });
      }
    }

    // 4. 미검토 PDF 업로드
    const { data: unreviewedPDFs } = await supabase
      .from('data_nodes')
      .select('id, raw, created_at')
      .eq('user_id', user.id)
      .eq('source_file_type', 'pdf')
      .filter('domain_data->>pdf_reviewed', 'eq', 'false')
      .order('created_at', { ascending: false })
      .limit(5);

    if (unreviewedPDFs) {
      for (const pdf of unreviewedPDFs) {
        items.push({
          id: `pdf-review-${pdf.id}`,
          type: 'pdf_review',
          title: '업로드 검토 (beta)',
          description: `${pdf.raw || '문서'}의 내용을 확인해 보세요`,
          href: `/my?node=${pdf.id}&tab=text`,
          createdAt: pdf.created_at as string,
        });
      }
    }

    setNotifications(items);
    setUnreadCount(items.length);
    setLoading(false);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscriptions (replace polling)
  useEffect(() => {
    if (!user) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel('notification-realtime')
      // Listen for new DM messages
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as { sender_id: string; content?: string; room_id: string };
        // Skip messages from self
        if (msg.sender_id === user.id) return;

        const preview = msg.content?.substring(0, 60) || '새 메시지';

        // Show toast notification
        mantineNotifications.show({
          title: '새 메시지',
          message: preview,
          color: 'dark',
          autoClose: 4000,
        });

        // Update notification items
        setNotifications(prev => {
          const existingIdx = prev.findIndex(n => n.id === `msg-${msg.room_id}`);
          const newItem: NotificationItem = {
            id: `msg-${msg.room_id}`,
            type: 'message',
            title: '새 메시지',
            description: preview,
            href: `/messages/${msg.room_id}`,
            createdAt: new Date().toISOString(),
          };

          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = newItem;
            return updated;
          }
          return [newItem, ...prev];
        });
        setUnreadCount(c => c + 1);
      })
      // Listen for new public data_nodes (from followed users)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'data_nodes',
        filter: 'visibility=eq.public',
      }, (payload) => {
        const node = payload.new as { user_id?: string; title?: string; raw?: string };
        // Skip own nodes
        if (node.user_id === user.id) return;

        const preview = node.title || node.raw?.substring(0, 40) || '새 글이 공유되었어요';

        // Show toast
        mantineNotifications.show({
          title: '새 피드',
          message: preview,
          color: 'dark',
          autoClose: 3000,
        });

        setUnreadCount(c => c + 1);
      })
      // Listen for new followers
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'persona_follows',
      }, async (payload) => {
        const follow = payload.new as { persona_id: string; follower_id: string };
        // Only care about follows to me
        if (follow.persona_id !== user.id) return;

        // Fetch follower profile
        let name = '회원';
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, handle')
          .eq('id', follow.follower_id)
          .single();

        if (profile) {
          name = profile.display_name || profile.handle || '회원';
        }

        mantineNotifications.show({
          title: '새 팔로워',
          message: `${name}님이 팔로우했습니다`,
          color: 'dark',
          autoClose: 3000,
        });

        setNotifications(prev => [{
          id: `follow-${follow.follower_id}`,
          type: 'follower',
          title: '새 팔로워',
          description: `${name}님이 팔로우했습니다`,
          href: `/profile/${profile?.handle || ''}`,
          createdAt: new Date().toISOString(),
        }, ...prev]);
        setUnreadCount(c => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { notifications, unreadCount, loading, refetch: fetchNotifications };
}
