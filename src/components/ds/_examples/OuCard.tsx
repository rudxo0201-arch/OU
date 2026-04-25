'use client';
import { OuCard } from '@/components/ds';

const Body = ({ v }: { v: string }) => (
  <span style={{ color: v === 'white' ? '#000' : 'var(--ou-text-body)', fontSize: 13 }}>
    {v} 카드
  </span>
);

export const OuCardExamples = [
  { label: 'floating',  Component: () => <OuCard variant="floating" padding={20}><Body v="floating"/></OuCard> },
  { label: 'glass',     Component: () => <OuCard variant="glass" padding={20}><Body v="glass"/></OuCard> },
  { label: 'white',     Component: () => <OuCard variant="white" padding={20}><Body v="white"/></OuCard> },
  { label: 'ghost',     Component: () => <OuCard variant="ghost" padding={20}><Body v="ghost"/></OuCard> },
  { label: 'hoverable', Component: () => <OuCard variant="floating" hoverable padding={20}><Body v="hoverable"/></OuCard> },
];
