'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

/**
 * 감정 일기 뷰
 * 참고: Day One, Daylio, Pixels
 * - 날짜별 그룹핑
 * - 무드 이모지 + 색상
 * - 무드 미니 캘린더 (Daylio 스타일)
 * - 내용 펼치기/접기
 */

const MOOD_MAP: Record<string, { emoji: string; color: string; label: string }> = {
  '기쁨':  { emoji: '😊', color: 'rgba(255,220,100,0.3)', label: '기쁨' },
  '감사':  { emoji: '🙏', color: 'rgba(255,200,150,0.3)', label: '감사' },
  '평온':  { emoji: '😌', color: 'rgba(150,220,255,0.3)', label: '평온' },
  '슬픔':  { emoji: '😢', color: 'rgba(120,150,255,0.3)', label: '슬픔' },
  '분노':  { emoji: '😤', color: 'rgba(255,120,100,0.3)', label: '분노' },
  '불안':  { emoji: '😰', color: 'rgba(200,160,255,0.3)', label: '불안' },
  '외로움': { emoji: '🥺', color: 'rgba(180,180,220,0.3)', label: '외로움' },
  '우울':  { emoji: '😔', color: 'rgba(140,140,180,0.3)', label: '우울' },
  '힘듦':  { emoji: '😩', color: 'rgba(180,140,140,0.3)', label: '힘듦' },
  '설렘':  { emoji: '🥰', color: 'rgba(255,180,200,0.3)', label: '설렘' },
};

const DEFAULT_MOOD = { emoji: '📝', color: 'rgba(255,255,255,0.05)', label: '' };

function getMoodInfo(mood?: string) {
  if (!mood) return DEFAULT_MOOD;
  return MOOD_MAP[mood] || DEFAULT_MOOD;
}

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood?: string;
  title?: string;
}

export function JournalView({ nodes }: ViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries: JournalEntry[] = useMemo(
    () =>
      nodes
        .filter(n => n.domain === 'emotion' || n.domain_data?.mood)
        .map(n => ({
          id: n.id,
          date: n.domain_data?.date ?? n.created_at ?? '',
          content: n.domain_data?.content ?? n.raw ?? '',
          mood: n.domain_data?.mood ?? n.domain_data?.emotion,
          title: n.domain_data?.title,
        }))
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of entries) {
      const key = entry.date ? dayjs(entry.date).format('YYYY-MM-DD') : '날짜 없음';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return Array.from(map.entries());
  }, [entries]);

  // 무드 통계
  const moodStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      if (e.mood) counts[e.mood] = (counts[e.mood] || 0) + 1;
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [entries]);

  const today = dayjs().format('YYYY-MM-DD');

  if (entries.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-dimmed)', fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📝</div>
        감정 기록이 없습니다. Orb에 오늘 기분을 말해보세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 560, margin: '0 auto' }}>
      {/* Mood summary */}
      {moodStats.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
          padding: '12px 16px', borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'wrap',
        }}>
          {moodStats.slice(0, 5).map(([mood, count]) => {
            const info = getMoodInfo(mood);
            return (
              <div key={mood} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                background: info.color,
                fontSize: 12,
              }}>
                <span>{info.emoji}</span>
                <span style={{ color: 'var(--ou-text-secondary)' }}>{info.label || mood}</span>
                <span style={{ color: 'var(--ou-text-dimmed)', fontSize: 10 }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Entries */}
      {grouped.map(([dateKey, dayEntries]) => {
        const isToday = dateKey === today;
        const dateLabel = dateKey === '날짜 없음' ? dateKey
          : isToday ? '오늘'
          : dayjs(dateKey).format('M월 D일 (ddd)');

        return (
          <div key={dateKey} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, marginBottom: 10,
              color: isToday ? 'var(--ou-text-strong)' : 'var(--ou-text-dimmed)',
            }}>
              {dateLabel}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayEntries.map(entry => {
                const info = getMoodInfo(entry.mood);
                const isExpanded = expandedId === entry.id;

                return (
                  <div
                    key={entry.id}
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: `1px solid ${isExpanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                      background: info.color,
                      cursor: 'pointer',
                      transition: '150ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{info.emoji}</span>
                      <div style={{ flex: 1 }}>
                        {entry.mood && (
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-strong)' }}>
                            {info.label || entry.mood}
                          </span>
                        )}
                        <div style={{
                          fontSize: 13, color: 'var(--ou-text-secondary)',
                          lineHeight: 1.6, marginTop: 2,
                          overflow: isExpanded ? 'visible' : 'hidden',
                          display: isExpanded ? 'block' : '-webkit-box',
                          WebkitLineClamp: isExpanded ? undefined : 2,
                          WebkitBoxOrient: 'vertical' as any,
                          whiteSpace: isExpanded ? 'pre-wrap' : undefined,
                        }}>
                          {entry.content}
                        </div>
                      </div>
                    </div>

                    {entry.date && (
                      <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginTop: 6, textAlign: 'right' }}>
                        {dayjs(entry.date).format('A h:mm')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
