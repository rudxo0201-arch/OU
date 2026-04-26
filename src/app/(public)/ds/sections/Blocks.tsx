'use client';

import { CSSProperties, ReactNode } from 'react';
import { Section, Grid } from './_shared';

export function BlocksSections() {
  return (
    <>
      <WhiteBlockSection />
      <FloatingVsGlassSection />
      <OrbBlockSection />
      <PillBlockSection />
      <InputBlockSection />
      <BadgeBlockSection />
      <BubbleBlockSection />
    </>
  );
}

// ─── 공통 Block 스타일 ─────────────────────────────────────────────────────────

const floatingBlock = (size: 'sm' | 'md' | 'lg' = 'md'): CSSProperties => ({
  background: 'transparent',
  border: '1px solid var(--ou-border-subtle)',
  borderRadius: size === 'sm' ? 'var(--ou-radius-md)' : 'var(--ou-radius-card)',
  padding: size === 'sm' ? 16 : size === 'lg' ? 32 : 24,
  boxShadow: 'var(--ou-glow-sm)',
  transition: 'var(--ou-transition)',
});

const glassBlock = (size: 'sm' | 'md' = 'md'): CSSProperties => ({
  background: 'var(--ou-surface-faint)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid var(--ou-border-subtle)',
  borderRadius: size === 'sm' ? 'var(--ou-radius-md)' : 'var(--ou-radius-card)',
  padding: size === 'sm' ? 16 : 24,
  boxShadow: 'var(--ou-glow-sm)',
  transition: 'var(--ou-transition)',
});

const whiteBlock = (size: 'sm' | 'md' | 'lg' = 'md'): CSSProperties => ({
  background: '#ffffff',
  border: '1px solid rgba(255,255,255,0.80)',
  borderRadius: size === 'sm' ? 'var(--ou-radius-md)' : 'var(--ou-radius-card)',
  padding: size === 'sm' ? 16 : size === 'lg' ? 32 : 24,
  color: '#000000',
  boxShadow: 'var(--ou-glow-aura-sm)',
  transition: 'var(--ou-transition)',
  position: 'relative',
  overflow: 'hidden',
});

function WhiteBlockInner({ children }: { children: ReactNode }) {
  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.55), transparent 60%)',
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </>
  );
}

// ─── Sections ──────────────────────────────────────────────────────────────────

function WhiteBlockSection() {
  return (
    <Section
      title="WhiteBlock — 흰 배경 카드 (우주의 별)"
      note="블랙 우주 위에 별처럼 존재. 화면의 1/5 이하 비율로만 사용. 환영·강조·CTA 전용."
    >
      <Grid cols={3}>
        {/* OWN UNIVERSE */}
        <div style={whiteBlock('md')}>
          <WhiteBlockInner>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>own universe</div>
            <div style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 26, fontWeight: 700, color: '#0a0a0a', marginBottom: 6, letterSpacing: '0.02em' }}>Just talk.</div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)' }}>대화로 만드는 나만의 우주</div>
          </WhiteBlockInner>
        </div>

        {/* 오늘의 일정 */}
        <div style={whiteBlock('md')}>
          <WhiteBlockInner>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>오늘의 일정</div>
            <div style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 26, fontWeight: 700, color: '#0a0a0a', marginBottom: 8 }}>APR 26</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['09:00', '수업'], ['15:00', '스터디'], ['20:00', '운동']].map(([t, n]) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
                  <span style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 13, fontWeight: 500, color: '#000', minWidth: 42 }}>{t}</span>{n}
                </div>
              ))}
            </div>
          </WhiteBlockInner>
        </div>

        {/* 이번 달 습관 */}
        <div style={whiteBlock('md')}>
          <WhiteBlockInner>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>이번 달 습관</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--ou-font-logo)', fontSize: 40, fontWeight: 700, color: '#0a0a0a' }}>27</span>
              <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)' }}>일 연속</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.60)' }}>운동 매일 30분</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
              {Array.from({ length: 26 }, (_, i) => (
                <div key={i} style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: i < 27 ? 'rgba(0,0,0,0.70)' : 'rgba(0,0,0,0.12)',
                }} />
              ))}
            </div>
          </WhiteBlockInner>
        </div>
      </Grid>
    </Section>
  );
}

function FloatingVsGlassSection() {
  return (
    <Section title="FloatingBlock vs GlassBlock">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div>
          <CompareLabel>Floating — 완전 투명</CompareLabel>
          <div style={floatingBlock('md')}>
            <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', marginBottom: 8 }}>FloatingBlock</div>
            <div style={{ fontSize: 14, color: 'var(--ou-text-strong)' }}>배경 없음. 테두리 + 글로우만.</div>
            <div style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', marginTop: 8 }}>우주에 떠 있는 기본 컨테이너</div>
          </div>
        </div>
        <div>
          <CompareLabel>Glass — 극미세 배경</CompareLabel>
          <div style={glassBlock('md')}>
            <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', marginBottom: 8 }}>GlassBlock</div>
            <div style={{ fontSize: 14, color: 'var(--ou-text-strong)' }}>아주 미세한 배경 + blur.</div>
            <div style={{ fontSize: 12, color: 'var(--ou-text-dimmed)', marginTop: 8 }}>내용이 많아 구분이 필요할 때</div>
          </div>
        </div>
      </div>

      <Grid cols={3}>
        <div style={floatingBlock('sm')}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginBottom: 6 }}>SM</div>
          <div style={{ fontSize: 13 }}>작은 패널</div>
        </div>
        <div style={floatingBlock('md')}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginBottom: 6 }}>MD (기본)</div>
          <div style={{ fontSize: 14 }}>채팅 패널, 사이드바</div>
        </div>
        <div style={floatingBlock('lg')}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', marginBottom: 6 }}>LG</div>
          <div style={{ fontSize: 14 }}>대시보드, 전체 뷰</div>
        </div>
      </Grid>
    </Section>
  );
}

function CompareLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 9,
      color: 'var(--ou-text-dimmed)',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ─── OrbBlock ──────────────────────────────────────────────────────────────────

function Orb({ size = 48, active = false, inactive = false, children }: { size?: number; active?: boolean; inactive?: boolean; children: ReactNode }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: `1px solid ${active ? 'var(--ou-border-strong)' : 'var(--ou-border-muted)'}`,
      cursor: 'pointer',
      fontSize: size === 36 ? 14 : 18,
      boxShadow: active ? 'var(--ou-glow-md)' : 'var(--ou-glow-sm)',
      opacity: inactive ? 0.5 : 1,
      transition: 'var(--ou-transition)',
      color: 'var(--ou-text-body)',
    }}>
      {children}
    </div>
  );
}

function OrbBlockSection() {
  return (
    <Section title="OrbBlock">
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Orb size={36} inactive>📄</Orb>
          <div style={{ fontSize: 9, color: 'var(--ou-text-dimmed)', marginTop: 6 }}>36px</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Orb size={48} active>📊</Orb>
          <div style={{ fontSize: 9, color: 'var(--ou-text-dimmed)', marginTop: 6 }}>48px (활성)</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Orb size={48} inactive>📅</Orb>
          <div style={{ fontSize: 9, color: 'var(--ou-text-dimmed)', marginTop: 6 }}>48px (비활성)</div>
        </div>
      </div>
    </Section>
  );
}

// ─── PillBlock ─────────────────────────────────────────────────────────────────

function Pill({ children, size = 'md' }: { children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const padding = size === 'sm' ? '4px 12px' : size === 'lg' ? '12px 24px' : '8px 16px';
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding,
      borderRadius: 'var(--ou-radius-pill)',
      border: '1px solid var(--ou-border-subtle)',
      background: 'transparent',
      fontSize,
      color: 'var(--ou-text-body)',
      cursor: 'pointer',
      boxShadow: 'var(--ou-glow-xs)',
      transition: 'var(--ou-transition)',
    }}>
      {children}
    </span>
  );
}

function PillBlockSection() {
  return (
    <Section title="PillBlock">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pill size="sm">♡ 감정</Pill>
        <Pill size="sm">📅 일정</Pill>
        <Pill>📅 수능까지 D-200</Pill>
        <Pill>📊 이번 달 지출</Pill>
        <Pill>💡 아이디어 정리</Pill>
        <Pill>뭐든 말씀해보세요</Pill>
      </div>
    </Section>
  );
}

// ─── InputBlock ────────────────────────────────────────────────────────────────

function InputBlockSection() {
  return (
    <Section title="InputBlock">
      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 기본 */}
        <input
          placeholder="뭐든 말씀해보세요..."
          style={{
            border: '1px solid var(--ou-border-subtle)',
            borderRadius: 'var(--ou-radius-pill)',
            background: 'transparent',
            padding: '14px 24px',
            fontSize: 15,
            color: 'var(--ou-text-bright)',
            width: '100%',
            outline: 'none',
            fontFamily: 'inherit',
            boxShadow: 'var(--ou-glow-xs)',
            transition: 'var(--ou-transition)',
          }}
        />

        {/* 채팅 입력 (빈 상태) */}
        <ChatInputDemo placeholder="메시지를 입력하세요..." />

        {/* 채팅 입력 (텍스트 입력 중) */}
        <ChatInputDemo value="감기에 좋은 본초 알려줘" active />
      </div>
    </Section>
  );
}

function ChatInputDemo({ placeholder, value, active }: { placeholder?: string; value?: string; active?: boolean }) {
  return (
    <div style={{
      border: `0.5px solid ${active ? 'var(--ou-border-medium)' : 'var(--ou-border-subtle)'}`,
      borderRadius: 'var(--ou-radius-chat)',
      background: 'transparent',
      boxShadow: active ? 'var(--ou-glow-sm)' : 'var(--ou-glow-xs)',
      padding: '8px 6px 8px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
    }}>
      <div style={{
        flex: 1,
        fontSize: 14,
        color: active ? 'var(--ou-text-strong)' : 'var(--ou-text-muted)',
        padding: '6px 0',
      }}>
        {value ?? placeholder}
      </div>
      <span style={{ fontSize: 16, color: 'var(--ou-text-muted)', padding: 8 }}>📎</span>
      <span style={{ fontSize: 16, color: 'var(--ou-text-muted)', padding: 8 }}>🎤</span>
      <button style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: `1px solid ${active ? 'rgba(255,255,255,0.5)' : 'var(--ou-border-subtle)'}`,
        background: 'transparent',
        boxShadow: active ? '0 0 12px 2px rgba(255,255,255,0.08)' : 'none',
        opacity: active ? 1 : 0.4,
        cursor: 'pointer',
        flexShrink: 0,
        color: active ? 'var(--ou-text-bright)' : 'var(--ou-text-muted)',
        fontSize: 14,
      }}>
        ↗
      </button>
    </div>
  );
}

// ─── BadgeBlock ────────────────────────────────────────────────────────────────

function Badge({ children, count = false }: { children: ReactNode; count?: boolean }) {
  if (count) {
    return (
      <span style={{
        display: 'inline-flex',
        width: 18,
        height: 18,
        borderRadius: 'var(--ou-radius-pill)',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--ou-bg)',
        background: 'var(--ou-text-body)',
        boxShadow: 'var(--ou-glow-sm)',
      }}>
        {children}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '5px 14px',
      borderRadius: 'var(--ou-radius-pill)',
      border: '0.5px solid var(--ou-border-subtle)',
      background: 'transparent',
      fontSize: 10,
      color: 'var(--ou-text-dimmed)',
      boxShadow: 'var(--ou-glow-xs)',
    }}>
      {children}
    </span>
  );
}

function BadgeBlockSection() {
  return (
    <Section title="BadgeBlock">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge>📖 지식</Badge>
        <Badge>📅 일정</Badge>
        <Badge>♡ 감정</Badge>
        <Badge>💡 아이디어</Badge>
        <Badge>📊 지출</Badge>
        <Badge count>3</Badge>
        <Badge count>7</Badge>
      </div>
    </Section>
  );
}

// ─── BubbleBlock ───────────────────────────────────────────────────────────────

function BubbleBlockSection() {
  return (
    <Section title="BubbleBlock (Chat)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680 }}>
        {/* User bubble */}
        <div style={{
          padding: '14px 16px',
          maxWidth: '70%',
          marginLeft: 'auto',
          background: 'var(--ou-surface-subtle)',
          border: '1px solid var(--ou-border-medium)',
          borderRadius: '20px 20px 4px 20px',
          boxShadow: 'var(--ou-glow-md)',
          fontSize: 13,
          color: 'var(--ou-text-bright)',
        }}>
          감기에 좋은 본초 알려줘
        </div>

        {/* Assistant bubble */}
        <div style={{
          padding: '14px 16px',
          maxWidth: '90%',
          paddingLeft: 14,
          borderLeft: '1.5px solid var(--ou-border-muted)',
          fontSize: 13,
          lineHeight: 1.8,
          color: 'var(--ou-text-body)',
        }}>
          마황은 발한해표하여 풍한표실증에 사용하며, 계지는 풍한표허증에 적합합니다. 두 본초 모두 매운 맛으로 양기를 발산시키지만 강도와 적용 범위가 다릅니다.
        </div>

        {/* User follow-up */}
        <div style={{
          padding: '14px 16px',
          maxWidth: '70%',
          marginLeft: 'auto',
          background: 'var(--ou-surface-subtle)',
          border: '1px solid var(--ou-border-medium)',
          borderRadius: '20px 20px 4px 20px',
          boxShadow: 'var(--ou-glow-md)',
          fontSize: 13,
          color: 'var(--ou-text-bright)',
        }}>
          그럼 둘 다 발한 효과가 있나요?
        </div>
      </div>
    </Section>
  );
}
