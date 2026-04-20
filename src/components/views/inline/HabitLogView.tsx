'use client';

/**
 * HabitLogView — 습관/운동 기록 카드
 * "오늘 5km 달림" → 5km 크게
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, extractData } from './base';

export function HabitLogView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const activity = data.activity || data.habit || data.exercise || data.title || nodes[0]?.title || '';
  const value = data.value || data.amount || data.distance || data.duration || data.count;
  const unit = data.unit || data.metric;
  const note = data.note || data.description;

  if (!activity) return null;

  // "5km", "30분" 같은 복합값 파싱
  const parseValueUnit = () => {
    if (value !== undefined && unit) return { v: String(value), u: unit };
    if (value !== undefined) {
      const match = String(value).match(/^([0-9.]+)\s*([^\s]+)?$/);
      if (match) return { v: match[1], u: match[2] || '' };
      return { v: String(value), u: '' };
    }
    return null;
  };

  const vu = parseValueUnit();

  return (
    <InlineCard label="HABIT">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* 수치 — 핵심 강조 */}
        {vu && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', flexShrink: 0 }}>
            <span style={TYPE.emphasis}>{vu.v}</span>
            {vu.u && <span style={{ ...TYPE.sub, fontSize: '16px', fontWeight: 600 }}>{vu.u}</span>}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div style={TYPE.title}>{activity}</div>
          {note && <div style={{ ...TYPE.meta, marginTop: '4px' }}>{note}</div>}
        </div>
      </div>
    </InlineCard>
  );
}
