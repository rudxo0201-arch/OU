'use client';

/**
 * TaskCheckView — 할 일 체크 카드
 * "레포트 제출하기" → ☐ 레포트 제출
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, NEU, extractData } from './base';

export function TaskCheckView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const title = data.title || data.task || data.what || nodes[0]?.title || '';
  const description = data.description || data.detail || data.note;
  const priority = data.priority; // high | medium | low

  if (!title) return null;

  const priorityDot: Record<string, string> = {
    high: 'rgba(0,0,0,0.5)',
    medium: 'rgba(0,0,0,0.25)',
    low: 'rgba(0,0,0,0.1)',
  };

  return (
    <InlineCard label="TASK">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* 체크박스 */}
        <div style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          flexShrink: 0,
          marginTop: '1px',
          ...NEU.cardPressed,
          padding: 0,
          boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.8)',
        }} />

        <div style={{ flex: 1 }}>
          {/* 우선순위 점 */}
          {priority && (
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: priorityDot[priority] || priorityDot.medium,
              marginBottom: '6px',
            }} />
          )}

          {/* 제목 */}
          <div style={TYPE.title}>{title}</div>

          {/* 설명 */}
          {description && (
            <div style={{ ...TYPE.sub, marginTop: '4px' }}>{description}</div>
          )}
        </div>
      </div>
    </InlineCard>
  );
}
