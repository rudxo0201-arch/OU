'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { notifications } from '@mantine/notifications';

export function useViewSubscription(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`view-updates-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'data_nodes',
        filter: `user_id=eq.${userId}`,
      }, () => {
        notifications.show({
          title: '구독 뷰 업데이트',
          message: '구독한 뷰에 새 데이터가 추가됐어요',
          color: 'gray',
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
