'use client';

import { Section, Grid } from './_shared';

export function TypographySection() {
  return (
    <Section title="Typography System — Orbitron + Pretendard">
      <Grid cols={2}>
        <FloatingPanel>
          <Micro>Orbitron — 강조 · 브랜딩 · 숫자</Micro>
          <Stack>
            <TypoRow meta="Orbitron 700 / 40px / xl">
              <span style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 40, fontWeight: 700, letterSpacing: '0.02em' }}>Just talk.</span>
            </TypoRow>
            <TypoRow meta="Orbitron 700 / 26px / lg">
              <span style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 26, fontWeight: 700, letterSpacing: '0.05em' }}>own universe</span>
            </TypoRow>
            <TypoRow meta="Orbitron 700 / 18px / md">
              <span style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 18, fontWeight: 700 }}>Schedule · Habit</span>
            </TypoRow>
            <TypoRow meta="Orbitron 500 / 13px / sm — 날짜·숫자">
              <span style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 13, fontWeight: 500 }}>APR 26 · 09:00</span>
            </TypoRow>
          </Stack>
        </FloatingPanel>

        <FloatingPanel>
          <Micro>Pretendard — 본문 위계 (크기+굵기)</Micro>
          <Stack>
            <TypoRow meta="Pretendard 700 / 24px / h1">
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--ou-text-strong)' }}>대화로 만드는 나만의 우주</span>
            </TypoRow>
            <TypoRow meta="Pretendard 700 / 18px / h2">
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ou-text-strong)' }}>오늘 할 일 3가지</span>
            </TypoRow>
            <TypoRow meta="Pretendard 600 / 15px / h3">
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-body)' }}>수학 스터디 준비</span>
            </TypoRow>
            <TypoRow meta="Pretendard 400 / 14px / body">
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ou-text-body)' }}>오늘 오후 3시에 친구들이랑 모여서 같이 공부하기로 했다.</span>
            </TypoRow>
            <TypoRow meta="Pretendard 400 / 13px / sub">
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ou-text-secondary)' }}>수학 · 영어 · 국어</span>
            </TypoRow>
            <TypoRow meta="Pretendard 500 / 11px / caption">
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ou-text-dimmed)' }}>2분 전 · 3개 연결됨</span>
            </TypoRow>
            <TypoRow meta="Pretendard 600 / 10px / micro uppercase">
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ou-text-dimmed)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>일정 / SCHEDULE</span>
            </TypoRow>
          </Stack>
        </FloatingPanel>
      </Grid>
    </Section>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FloatingPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'transparent',
      border: '1px solid var(--ou-border-subtle)',
      borderRadius: 'var(--ou-radius-card)',
      padding: 24,
      boxShadow: 'var(--ou-glow-sm)',
    }}>
      {children}
    </div>
  );
}

function Micro({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      color: 'var(--ou-text-dimmed)',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      marginBottom: 20,
    }}>
      {children}
    </div>
  );
}

function Stack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>;
}

function TypoRow({ children, meta }: { children: React.ReactNode; meta: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {children}
      <span style={{
        fontSize: 9,
        color: 'var(--ou-text-dimmed)',
        fontFamily: 'var(--ou-font-mono)',
        letterSpacing: '0.04em',
      }}>
        {meta}
      </span>
    </div>
  );
}
