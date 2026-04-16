'use client';

import { useState, useMemo } from 'react';
import { Users, SortAscending, CaretDown, CaretUp } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

type SortMode = 'recent' | 'name' | 'relationship';

interface ContactCard {
  id: string;
  name: string;
  relationship: string;
  contact: string;
  lastMentioned: string;
  birthday: string;
  memo: string;
  raw: string;
  isStale: boolean;
}

export function RelationshipView({ nodes }: ViewProps) {
  const [sort, setSort] = useState<SortMode>('recent');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cards: ContactCard[] = useMemo(
    () =>
      nodes.map(n => {
        const dd = n.domain_data ?? {};
        const lastDate = dd.date ?? dd.last_mentioned ?? n.created_at ?? '';
        const daysSince = lastDate ? dayjs().diff(dayjs(lastDate), 'day') : 999;
        return {
          id: n.id,
          name: dd.name ?? ((n.raw ?? '').slice(0, 20) || '이름 없음'),
          relationship: dd.relationship ?? dd.type ?? '',
          contact: dd.contact ?? '',
          lastMentioned: lastDate,
          birthday: dd.birthday ?? '',
          memo: dd.memo ?? dd.content ?? n.raw ?? '',
          raw: n.raw ?? '',
          isStale: daysSince > 30,
        };
      }),
    [nodes],
  );

  const sorted = useMemo(() => {
    const list = [...cards];
    switch (sort) {
      case 'recent':
        return list.sort((a, b) => (a.lastMentioned > b.lastMentioned ? -1 : 1));
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      case 'relationship':
        return list.sort((a, b) => a.relationship.localeCompare(b.relationship, 'ko'));
      default:
        return list;
    }
  }, [cards, sort]);

  const totalContacts = cards.length;

  const thisMonth = useMemo(() => {
    const monthStart = dayjs().startOf('month');
    return cards.filter(c => c.lastMentioned && dayjs(c.lastMentioned).isAfter(monthStart)).length;
  }, [cards]);

  const upcomingBirthdays = useMemo(() => {
    const today = dayjs();
    const twoWeeksLater = today.add(14, 'day');
    return cards.filter(c => {
      if (!c.birthday) return false;
      const bday = dayjs(c.birthday).year(today.year());
      const checkDate = bday.isBefore(today) ? bday.add(1, 'year') : bday;
      return checkDate.isBefore(twoWeeksLater);
    }).length;
  }, [cards]);

  const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: 'recent', label: '최근 연락순' },
    { value: 'name', label: '이름순' },
    { value: 'relationship', label: '관계별' },
  ];

  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: '전체', value: totalContacts },
          { label: '이번 달', value: thisMonth },
          { label: '다가오는 생일', value: upcomingBirthdays },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '8px 12px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block' }}>{stat.label}</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <SortAscending size={14} />
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            style={{
              padding: '2px 10px',
              borderRadius: 14,
              fontSize: 12,
              border: '0.5px solid var(--ou-border, #333)',
              background: sort === opt.value ? 'var(--ou-gray-9, #222)' : 'transparent',
              color: sort === opt.value ? '#fff' : 'inherit',
              transition: 'all 150ms',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {sorted.map(card => {
          const isExpanded = expandedId === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setExpandedId(isExpanded ? null : card.id)}
              style={{
                border: card.isStale
                  ? '1px dashed var(--ou-gray-5, #888)'
                  : '0.5px solid var(--ou-border, #333)',
                borderRadius: 8,
                padding: 12,
                transition: 'all 150ms',
                textAlign: 'left',
                background: 'none',
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{card.name}</span>
                {isExpanded ? <CaretUp size={12} /> : <CaretDown size={12} />}
              </div>

              {card.relationship && (
                <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid var(--ou-border, #333)', borderRadius: 4, display: 'inline-block', marginBottom: 4 }}>
                  {card.relationship}
                </span>
              )}

              {card.lastMentioned && (
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block' }}>
                  {dayjs(card.lastMentioned).format('YYYY.MM.DD')}
                  {card.isStale && ' · 30일 이상 연락 없음'}
                </span>
              )}

              {card.memo && !isExpanded && (
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 4 }}>
                  {card.memo}
                </span>
              )}

              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, borderTop: '0.5px solid var(--ou-border, #333)', paddingTop: 8 }}>
                  {card.contact && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>연락처</span>
                      <span style={{ fontSize: 11 }}>{card.contact}</span>
                    </div>
                  )}
                  {card.birthday && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>생일</span>
                      <span style={{ fontSize: 11 }}>{dayjs(card.birthday).format('M월 D일')}</span>
                    </div>
                  )}
                  {card.memo && (
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 2 }}>메모</span>
                      <span style={{ fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {card.memo}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
