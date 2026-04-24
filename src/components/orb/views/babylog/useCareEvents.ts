import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCareSubjectsStore } from '@/stores/careSubjectsStore';

export interface CareEvent {
  id: string;
  domain_data: Record<string, any>;
  created_at: string;
}

export function useCareEvents(eventType: string) {
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const activeSubjectName = useCareSubjectsStore(s => s.activeSubjectName);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/nodes?domain=care&limit=200');
      const json = res.ok ? await res.json() : { nodes: [] };
      const all: CareEvent[] = Array.isArray(json.nodes) ? json.nodes : [];
      const filtered = all.filter(n => {
        const dd = n.domain_data ?? {};
        if (dd.event_type !== eventType) return false;
        if (activeSubjectName && dd.subject_name !== activeSubjectName) return false;
        return true;
      });
      setEvents(filtered);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [eventType, activeSubjectName]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`care-${eventType}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_nodes', filter: 'domain=eq.care' }, fetchEvents)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventType, fetchEvents]);

  // ou-node-created 이벤트
  useEffect(() => {
    function handler(e: Event) {
      if ((e as CustomEvent).detail?.domain === 'care') fetchEvents();
    }
    window.addEventListener('ou-node-created', handler);
    return () => window.removeEventListener('ou-node-created', handler);
  }, [fetchEvents]);

  return { events, loading };
}
