'use client';
import { OuIconButton } from '@/components/ds';

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const ZoomIn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
);

export const OuIconButtonExamples = [
  { label: 'ghost (기본)',   Component: () => <OuIconButton icon={<CloseIcon />} aria-label="닫기" /> },
  { label: 'solid',          Component: () => <OuIconButton icon={<PlusIcon />} aria-label="추가" variant="solid" /> },
  { label: 'size: sm',       Component: () => <OuIconButton icon={<ZoomIn />} aria-label="확대" size="sm" /> },
  { label: 'disabled',       Component: () => <OuIconButton icon={<CloseIcon />} aria-label="닫기" disabled /> },
  { label: '여러 개 나열',    Component: () => (
    <div style={{ display: 'flex', gap: 4 }}>
      <OuIconButton icon={<PlusIcon />} aria-label="추가" variant="solid" />
      <OuIconButton icon={<ZoomIn />}   aria-label="확대" variant="solid" />
      <OuIconButton icon={<CloseIcon />} aria-label="닫기" />
    </div>
  )},
];
