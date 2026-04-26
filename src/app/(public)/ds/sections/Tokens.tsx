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
              border: '1px solid var(--ou-border-card)',
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
  { key: 'faint',  desc: '0.06' },
  { key: 'subtle', desc: '0.10' },
  { key: 'muted',  desc: '0.14' },
  { key: 'medium', desc: '0.18' },
  { key: 'hover',  desc: '0.25' },
  { key: 'strong', desc: '0.30' },
  { key: 'card',   desc: '0.40 — 카드 전용' },
  { key: 'mid',    desc: '0.40 — 컨트롤 전용' },
  { key: 'focus',  desc: '0.45' },
];

function BorderSection() {
  return (
    <Section title="Border Tokens">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {BORDER_TOKENS.map(t => (
          <SwatchGroup key={t.key} label={`${t.key}\n${t.desc}`}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--ou-radius-md)',
              border: `1.5px solid var(--ou-border-${t.key})`,
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
  { token: '--ou-text-heading',   label: 'TEXT-HEADING — 섹션 타이틀',
    extra: { fontFamily: 'var(--ou-font-display)', fontSize: 10, letterSpacing: 5, textTransform: 'uppercase' as const } },
];

const ORBITRON_SCALE = [
  { size: 40, weight: 700, label: 'xl / 강조 헤드라인', sample: 'Just talk.' },
  { size: 26, weight: 700, label: 'lg / 서브 헤드라인', sample: 'own universe' },
  { size: 18, weight: 700, label: 'md / 섹션 타이틀', sample: 'Schedule · Habit' },
  { size: 13, weight: 500, label: 'sm / 날짜·숫자', sample: 'APR 26 · 09:00' },
];

function TextSection() {
  return (
    <Section title="Text Tokens">
      {/* 컬러 계층 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 48 }}>
        {TEXT_TOKENS.map(t => (
          <div key={t.token} style={{ fontSize: 14, color: `var(${t.token})`, ...t.extra }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Orbitron 스케일 — --ou-font-display */}
      <div style={{
        borderTop: '0.5px solid var(--ou-border-subtle)',
        paddingTop: 32,
      }}>
        <div style={{
          fontSize: 9, fontFamily: 'var(--ou-font-display)',
          letterSpacing: 4, textTransform: 'uppercase',
          color: 'var(--ou-text-muted)', marginBottom: 24,
        }}>
          Orbitron — <code style={{ fontFamily: 'var(--ou-font-mono)', fontSize: 9 }}>--ou-font-display</code> — 강조·브랜딩·숫자
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {ORBITRON_SCALE.map(({ size, weight, label, sample }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
              <div style={{
                fontFamily: 'var(--ou-font-display)',
                fontSize: size,
                fontWeight: weight,
                color: 'var(--ou-text-heading)',
                lineHeight: 1.1,
                minWidth: 320,
              }}>
                {sample}
              </div>
              <div style={{
                fontFamily: 'var(--ou-font-mono)',
                fontSize: 11,
                color: 'var(--ou-text-dimmed)',
                whiteSpace: 'nowrap',
              }}>
                Orbitron {weight} / {size}px / {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Radius Tokens ─────────────────────────────────────────────────────────────

const RADIUS_TOKENS = [
  { label: 'pill',     token: '--ou-radius-pill', w: 72, h: 32 },
  { label: 'xl (24)',  token: '--ou-radius-xl',   w: 56, h: 56 },
  { label: 'lg (20)',  token: '--ou-radius-lg',   w: 56, h: 56 },
  { label: 'card (16)', token: '--ou-radius-card', w: 56, h: 56 },
  { label: 'md (12)',  token: '--ou-radius-md',   w: 56, h: 56 },
  { label: 'sm (8)',   token: '--ou-radius-sm',   w: 56, h: 56 },
  { label: 'xs (4)',   token: '--ou-radius-xs',   w: 56, h: 56 },
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
              border: '1px solid var(--ou-border-card)',
              boxShadow: 'var(--ou-glow-xs)',
            }} />
          </SwatchGroup>
        ))}
      </div>
    </Section>
  );
}
