'use client';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
}

export function TimelineView({ nodes }: ViewProps) {
  const items: TimelineItem[] = useMemo(
    () =>
      nodes
        .map(n => ({
          id: n.id,
          date: n.domain_data?.date ?? n.created_at ?? '',
          title: n.domain_data?.title ?? ((n.raw ?? '').slice(0, 40) || '항목'),
          description: n.domain_data?.description ?? n.domain_data?.content ?? n.raw ?? '',
        }))
        .sort((a, b) => (a.date > b.date ? -1 : 1)),
    [nodes],
  );

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 16 }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', marginBottom: 16 }}>타임라인</span>

      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={item.id} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            {/* Date column */}
            <div style={{ width: 72, flexShrink: 0, textAlign: 'right', paddingTop: 2 }}>
              {item.date && (
                <>
                  <span style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2, display: 'block' }}>
                    {dayjs(item.date).format('M월 D일')}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--ou-text-dimmed, #888)', display: 'block' }}>
                    {dayjs(item.date).format('YYYY')}
                  </span>
                </>
              )}
            </div>

            {/* Dot + Line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: i === 0 ? 'currentColor' : 'var(--ou-gray-5, #888)',
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              {!isLast && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    minHeight: 32,
                    backgroundColor: 'var(--ou-border, #333)',
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
              <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, display: 'block' }}>
                {item.title}
              </span>
              {item.description && item.description !== item.title && (
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', marginTop: 2, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.description}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
