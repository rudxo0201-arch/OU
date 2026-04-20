'use client';

/**
 * RelationCardView — 인물 카드
 * "민준이 생일 5월3일" → 민준 크게
 */

import React from 'react';
import { ViewProps } from '../registry';
import { InlineCard, TYPE, NEU, extractData, formatDate } from './base';

export function RelationCardView({ nodes }: ViewProps) {
  const data = extractData(nodes);
  const name = data.name || data.person || nodes[0]?.title || '';
  const relationship = data.relationship || data.relation || data.type;
  const birthday = data.birthday || data.birth_date;
  const phone = data.phone || data.contact || data.mobile;
  const note = data.note || data.memo;

  if (!name) return null;

  // 이름 이니셜 아바타
  const initials = name.slice(0, 1);

  return (
    <InlineCard label="PERSON">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* 아바타 */}
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'var(--ou-bg-secondary, #f0f0f3)',
          boxShadow: '4px 4px 8px rgba(0,0,0,0.07), -4px -4px 8px rgba(255,255,255,0.85)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--ou-text-secondary, #666)',
        }}>
          {initials}
        </div>

        <div style={{ flex: 1 }}>
          {/* 이름 */}
          <div style={TYPE.emphasisMd}>{name}</div>
          {relationship && (
            <div style={{ ...TYPE.meta, marginTop: '3px' }}>{relationship}</div>
          )}
        </div>
      </div>

      {/* 부가 정보 */}
      {(birthday || phone || note) && (
        <div style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {birthday && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={TYPE.meta}>생일</span>
              <span style={TYPE.sub}>{formatDate(birthday)}</span>
            </div>
          )}
          {phone && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={TYPE.meta}>연락처</span>
              <span style={TYPE.sub}>{phone}</span>
            </div>
          )}
          {note && (
            <div style={TYPE.meta}>{note}</div>
          )}
        </div>
      )}
    </InlineCard>
  );
}
