'use client';

import { Section, SwatchGroup } from './_shared';

export function TokensSections() {
  return (
    <>
      <GlowSection />
      <BorderSection />
      <TextSection />
      <RadiusSection />
    </>
  );
}

// ── Glow Tokens ───────────────────────────────────────────────────────────────

const GLOW_TOKENS = [
  { label: 'glow-xs',        boxShadow: 'var(--ou-glow-xs)',        radius: 'var(--ou-radius-card)' },
  { label: 'glow-sm',        boxShadow: 'var(--ou-glow-sm)',        radius: 'var(--ou-radius-card)' },
  { label: 'glow-md',        boxShadow: 'var(--ou-glow-md)',        radius: 'var(--ou-radius-card)' },
  { label: 'glow-lg',        boxShadow: 'var(--ou-glow-lg)',        radius: 'var(--ou-radius-card)' },
  { label: 'glow-hover',     boxShadow: 'var(--ou-glow-hover)',     radius: 'var(--ou-radius-card)' },
  { label: 'glow-important', boxShadow: 'var(--ou-glow-important)', radius: '50%'                   },
  { label: 'glow-aura-sm',   boxShadow: 'var(--ou-glow-aura-sm)',   radius: 'var(--ou-radius-card)' },
  { label: 'glow-aura-md',   boxShadow: 'var(--ou-glow-aura-md)',   radius: 'var(--ou-radius-card)' },
];

function GlowSection() {
  return (
    <Section title="Glow Tokens (핵심)">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {GLOW_TOKENS.map(t => (
          <SwatchGroup key={t.label} label={t.label}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: t.radius,
              border: '0.5px solid var(--ou-border-subtle)',
              boxShadow: t.boxShadow,
              flexShrink: 0,
            }} />
          </SwatchGroup>
        ))}
      </div>
    </Section>
  );
}

// ── Border Tokens ─────────────────────────────────────────────────────────────

const BORDER_TOKENS = [
  'faint', 'subtle', 'muted', 'medium', 'hover', 'strong',
];

function BorderSection() {
  return (
    <Section title="Border Tokens">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {BORDER_TOKENS.map(t => (
          <SwatchGroup key={t} label={t}>
            <div style={{
              width: 48, height: 48,
              borderRadius: 'var(--ou-radius-md)',
              border: `1.5px solid var(--ou-border-${t})`,
              background: 'transparent',
            }} />
          </SwatchGroup>
        ))}
      </div>
    </Section>
  );
}

// ── Text Tokens ───────────────────────────────────────────────────────────────

const TEXT_TOKENS: { token: string; label: string; extra?: React.CSSProperties }[] = [
  { token: '--ou-text-faint',     label: 'text-faint — 거의 안 보이는 구분선' },
  { token: '--ou-text-muted',     label: 'text-muted — 플레이스홀더' },
  { token: '--ou-text-dimmed',    label: 'text-dimmed — 보조 텍스트' },
  { token: '--ou-text-secondary', label: 'text-secondary — 중간 강조' },
  { token: '--ou-text-body',      label: 'text-body — 본문 텍스트' },
  { token: '--ou-text-strong',    label: 'text-strong — 강조 / 호버' },
  { token: '--ou-text-bright',    label: 'text-bright — 최대 대비' },
  { token: '--ou-text-heading',   label: 'text-heading — 섹션 타이틀',
    extra: { fontFamily: 'var(--ou-font-logo)', fontSize: 9, letterSpacing: 5, textTransform: 'uppercase' } },
];

function TextSection() {
  return (
    <Section title="Text Tokens">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {TEXT_TOKENS.map(t => (
          <div
            key={t.token}
            style={{ fontSize: 14, color: `var(${t.token})`, ...t.extra }}
          >
            {t.label}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Radius Tokens ─────────────────────────────────────────────────────────────

const RADIUS_TOKENS = [
  { label: 'pill', token: '--ou-radius-pill', w: 64, h: 28 },
  { label: 'xl (24)',  token: '--ou-radius-xl',   w: 48, h: 48 },
  { label: 'lg (20)',  token: '--ou-radius-lg',   w: 48, h: 48 },
  { label: 'card (16)', token: '--ou-radius-card', w: 48, h: 48 },
  { label: 'md (12)',  token: '--ou-radius-md',   w: 48, h: 48 },
  { label: 'sm (8)',   token: '--ou-radius-sm',   w: 48, h: 48 },
  { label: 'xs (4)',   token: '--ou-radius-xs',   w: 48, h: 48 },
];

function RadiusSection() {
  return (
    <Section title="Radius Tokens">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {RADIUS_TOKENS.map(t => (
          <SwatchGroup key={t.token} label={t.label}>
            <div style={{
              width: t.w, height: t.h,
              borderRadius: `var(${t.token})`,
              background: 'transparent',
              border: '0.5px solid var(--ou-border-muted)',
              boxShadow: 'var(--ou-glow-xs)',
            }} />
          </SwatchGroup>
        ))}
      </div>
    </Section>
  );
}
