'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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
        // Replacing mantine notifications with console log
        // In production this should use a custom toast system
        console.log('[ViewSubscription] 구독한 뷰에 새 데이터가 추가됐어요');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}
