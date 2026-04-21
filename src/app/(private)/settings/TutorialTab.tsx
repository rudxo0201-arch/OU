'use client';

import { useRouter } from 'next/navigation';
import { Section } from './_shared';

type TutorialCard = {
  id: string;
  title: string;
  description: string;
  route: string;
  badge?: string;
};

const TUTORIALS: TutorialCard[] = [
  {
    id: 'basic',
    title: '기본 튜토리얼',
    description: 'OU의 기본 사용법을 익힙니다. Orb에 말하면 데이터가 쌓이는 흐름을 체험해보세요.',
    route: '/home?tutorial=replay',
    badge: '5분',
  },
];

export function TutorialTab() {
  const router = useRouter();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Section title="튜토리얼">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {TUTORIALS.map(card => (
            <TutorialCard key={card.id} card={card} onStart={() => router.push(card.route)} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function TutorialCard({ card, onStart }: { card: TutorialCard; onStart: () => void }) {
  return (
    <div style={{
      padding: '20px',
      borderRadius: 16,
      border: '1px solid var(--ou-border-subtle)',
      background: 'var(--ou-surface-faint)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-bright)', lineHeight: 1.3 }}>{card.title}</span>
        {card.badge && (
          <span style={{
            fontSize: 10, fontWeight: 500, color: 'var(--ou-text-muted)',
            padding: '2px 8px', borderRadius: 999,
            border: '1px solid var(--ou-border-subtle)',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {card.badge}
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.6 }}>
        {card.description}
      </p>
      <button
        onClick={onStart}
        style={{
          marginTop: 4,
          padding: '8px 16px',
          borderRadius: 10,
          border: '1px solid var(--ou-border-medium)',
          background: 'transparent',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ou-text-strong)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          alignSelf: 'flex-start',
          transition: 'all 0.15s',
        }}
      >
        시작하기
      </button>
    </div>
  );
}
