'use client';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: string;
}

export function JournalView({ nodes }: ViewProps) {
  const entries: JournalEntry[] = useMemo(
    () =>
      nodes
        .map(n => ({
          id: n.id,
          date: n.domain_data?.date ?? n.created_at ?? '',
          title: n.domain_data?.title ?? '',
          content: n.domain_data?.content ?? n.raw ?? '',
          mood: n.domain_data?.mood ?? n.domain_data?.emotion,
        }))
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  const grouped = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    for (const entry of entries) {
      const key = entry.date ? dayjs(entry.date).format('YYYY-MM-DD') : '날짜 없음';
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return Object.entries(map);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 16 }}>
      {grouped.map(([dateKey, dayEntries], gi) => (
        <div key={dateKey}>
          {gi > 0 && <div style={{ borderTop: '0.5px solid var(--ou-border, #333)', marginBottom: 16 }} />}

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {dateKey === '날짜 없음'
                ? dateKey
                : dayjs(dateKey).format('M월 D일 dddd')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 12, borderLeft: '1px solid var(--ou-border, #333)' }}>
            {dayEntries.map(entry => (
              <div key={entry.id} style={{ paddingLeft: 16 }}>
                {entry.mood && (
                  <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 2 }}>
                    {entry.mood}
                  </span>
                )}
                {entry.title && (
                  <span style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    {entry.title}
                  </span>
                )}
                <p
                  style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}
                >
                  {entry.content}
                </p>
                {entry.date && (
                  <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginTop: 4 }}>
                    {dayjs(entry.date).format('A h:mm')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
