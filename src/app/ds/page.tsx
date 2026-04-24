'use client';

import { useState } from 'react';
import {
  OuButton, OuCard, OuInput, OuModal, OuAvatar, OuDivider, OuTabs,
  ToastProvider, useToast,
  NeuBadge, NeuCheckbox, NeuProgress, NeuSearchBar, NeuSelect,
  NeuSlider, NeuTable, NeuTag, NeuTextarea, NeuToggle, NeuNavItem,
  NeuSectionTitle, NeuNotificationBadge, NeuCircleDisplay,
} from '@/components/ds';

// ── 팔레트 목록 ────────────────────────────────────────────
const PALETTES = ['cosmos', 'nebula', 'aurora', 'solar'] as const;
type Palette = typeof PALETTES[number];

// ── 섹션 네비 ──────────────────────────────────────────────
const SECTIONS = ['tokens', 'button', 'card', 'input', 'modal', 'avatar', 'divider', 'tabs', 'badge', 'misc'] as const;
type Section = typeof SECTIONS[number];

const SECTION_LABELS: Record<Section, string> = {
  tokens: '토큰',
  button: 'OuButton',
  card: 'OuCard',
  input: 'OuInput',
  modal: 'OuModal',
  avatar: 'OuAvatar',
  divider: 'OuDivider',
  tabs: 'OuTabs',
  badge: 'Badges & Tags',
  misc: 'Misc',
};

// ── 토큰 섹션 ──────────────────────────────────────────────
const SHADOW_TOKENS = [
  { name: '--ou-shadow-sm', label: 'shadow-sm (카드)' },
  { name: '--ou-shadow-md', label: 'shadow-md' },
  { name: '--ou-shadow-lg', label: 'shadow-lg (모달)' },
  { name: '--ou-shadow-card', label: 'shadow-card (위젯)' },
];

const COLOR_TOKENS = [
  { name: '--ou-space', label: 'space (배경)' },
  { name: '--ou-surface', label: 'surface (카드)' },
  { name: '--ou-accent', label: 'accent' },
  { name: '--ou-text-heading', label: 'text-heading' },
  { name: '--ou-text-body', label: 'text-body' },
  { name: '--ou-text-secondary', label: 'text-secondary' },
  { name: '--ou-text-muted', label: 'text-muted' },
  { name: '--ou-success', label: 'success' },
  { name: '--ou-warning', label: 'warning' },
  { name: '--ou-error', label: 'error' },
  { name: '--ou-info', label: 'info' },
];

const RADIUS_TOKENS = [
  { name: '--ou-radius-xs', label: 'radius-xs' },
  { name: '--ou-radius-sm', label: 'radius-sm' },
  { name: '--ou-radius-md', label: 'radius-md' },
  { name: '--ou-radius-card', label: 'radius-card' },
  { name: '--ou-radius-lg', label: 'radius-lg' },
  { name: '--ou-radius-pill', label: 'radius-pill' },
];

function ColorSwatch({ name, label }: { name: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div style={{
        width: 64, height: 40,
        background: `var(${name})`,
        borderRadius: 'var(--ou-radius-sm)',
        border: '1px solid var(--ou-glass-border)',
        boxShadow: 'var(--ou-shadow-sm)',
      }} />
      <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
      <code style={{ fontSize: 9, color: 'var(--ou-text-secondary)', fontFamily: 'var(--ou-font-mono)' }}>
        {name}
      </code>
    </div>
  );
}

function ShadowSwatch({ name, label }: { name: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div style={{
        width: 80, height: 48,
        background: 'var(--ou-surface)',
        borderRadius: 'var(--ou-radius-md)',
        boxShadow: `var(${name})`,
        border: '1px solid var(--ou-glass-border)',
      }} />
      <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', textAlign: 'center' }}>{label}</span>
      <code style={{ fontSize: 9, color: 'var(--ou-text-secondary)', fontFamily: 'var(--ou-font-mono)' }}>{name}</code>
    </div>
  );
}

function RadiusSwatch({ name, label }: { name: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div style={{
        width: 64, height: 32,
        background: 'var(--ou-accent)',
        borderRadius: `var(${name})`,
      }} />
      <span style={{ fontSize: 11, color: 'var(--ou-text-muted)', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

// ── 섹션 컴포넌트들 ─────────────────────────────────────────
function TokenSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ou-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>COLOR</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {COLOR_TOKENS.map(t => <ColorSwatch key={t.name} {...t} />)}
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ou-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>SHADOW</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {SHADOW_TOKENS.map(t => <ShadowSwatch key={t.name} {...t} />)}
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ou-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>RADIUS</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {RADIUS_TOKENS.map(t => <RadiusSwatch key={t.name} {...t} />)}
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ou-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>TYPOGRAPHY</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['--ou-text-hero', '--ou-text-3xl', '--ou-text-2xl', '--ou-text-xl', '--ou-text-lg', '--ou-text-base', '--ou-text-sm', '--ou-text-xs', '--ou-text-micro'] as const).map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: `var(${t})`, color: 'var(--ou-text-heading)', lineHeight: 1.2 }}>Aa</span>
              <code style={{ fontSize: 11, color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-mono)' }}>{t}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ButtonSection() {
  const [loading, setLoading] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {(['default', 'ghost', 'accent', 'danger'] as const).map(variant => (
        <div key={variant}>
          <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12, fontFamily: 'var(--ou-font-mono)' }}>variant="{variant}"</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {(['sm', 'md', 'lg'] as const).map(size => (
              <OuButton key={size} variant={variant} size={size}>{size}</OuButton>
            ))}
            <OuButton variant={variant} loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
              Loading
            </OuButton>
            <OuButton variant={variant} disabled>Disabled</OuButton>
          </div>
        </div>
      ))}
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12, fontFamily: 'var(--ou-font-mono)' }}>fullWidth</p>
        <OuButton fullWidth>Full Width Button</OuButton>
      </div>
    </div>
  );
}

function CardSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {(['raised', 'pressed', 'flat'] as const).map(variant => (
        <div key={variant}>
          <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12, fontFamily: 'var(--ou-font-mono)' }}>variant="{variant}"</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {(['sm', 'md', 'lg'] as const).map(size => (
              <OuCard key={size} variant={variant} size={size}>
                <p style={{ fontSize: 13, color: 'var(--ou-text-body)', margin: 0 }}>{size} card</p>
                <p style={{ fontSize: 11, color: 'var(--ou-text-muted)', margin: '4px 0 0' }}>variant={variant}</p>
              </OuCard>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12, fontFamily: 'var(--ou-font-mono)' }}>hoverable + elevated</p>
        <div style={{ display: 'flex', gap: 16 }}>
          <OuCard hoverable>
            <p style={{ fontSize: 13, color: 'var(--ou-text-body)', margin: 0 }}>Hoverable</p>
          </OuCard>
          <OuCard elevated>
            <p style={{ fontSize: 13, color: 'var(--ou-text-body)', margin: 0 }}>Elevated (shadow-lg)</p>
          </OuCard>
        </div>
      </div>
    </div>
  );
}

function InputSection() {
  const [val, setVal] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 400 }}>
      {(['sm', 'md', 'lg'] as const).map(size => (
        <OuInput key={size} size={size} label={`size="${size}"`} placeholder={`${size} input`} value={val} onChange={e => setVal(e.target.value)} />
      ))}
      <OuInput label="With prefix & suffix" prefix={<span>₩</span>} suffix={<span>원</span>} placeholder="금액 입력" />
      <OuInput label="Error state" error="이 값은 필수입니다" placeholder="필수 입력" />
    </div>
  );
}

function ModalSection() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <OuButton onClick={() => setOpen(true)}>모달 열기</OuButton>
      <OuModal open={open} onClose={() => setOpen(false)} title="모달 제목" width={400}>
        <p style={{ color: 'var(--ou-text-body)', marginBottom: 16 }}>OuModal — shadow-lg, 오버레이 blur(4px), 패널 no-blur.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <OuButton variant="ghost" onClick={() => setOpen(false)}>취소</OuButton>
          <OuButton variant="accent" onClick={() => setOpen(false)}>확인</OuButton>
        </div>
      </OuModal>
    </div>
  );
}

function AvatarSection() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
      {[24, 32, 40, 56, 72].map(size => (
        <OuAvatar key={size} name="Own Universe" size={size} />
      ))}
      <OuAvatar name="OU" size={48} glow />
      <OuAvatar src="https://api.dicebear.com/7.x/initials/svg?seed=OU" name="OU" size={48} />
    </div>
  );
}

function DividerSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>Horizontal</p>
        <OuDivider />
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>Vertical</p>
        <div style={{ display: 'flex', height: 40, gap: 16, alignItems: 'center' }}>
          <span style={{ color: 'var(--ou-text-body)' }}>Left</span>
          <OuDivider vertical />
          <span style={{ color: 'var(--ou-text-body)' }}>Right</span>
        </div>
      </div>
    </div>
  );
}

function TabsSection() {
  const [active, setActive] = useState('a');
  const tabs = [
    { key: 'a', label: 'Quick' },
    { key: 'b', label: 'Search' },
    { key: 'c', label: 'Deep Talk' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <OuTabs tabs={tabs} activeKey={active} onChange={setActive} />
      <p style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>선택된 탭: {active}</p>
    </div>
  );
}

function BadgeSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>NeuBadge / OuBadge</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <NeuBadge>기본</NeuBadge>
          <NeuBadge>일정</NeuBadge>
          <NeuBadge>할일</NeuBadge>
          <NeuBadge>지출</NeuBadge>
        </div>
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>NeuTag / OuTag</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <NeuTag>태그1</NeuTag>
          <NeuTag>태그2</NeuTag>
          <NeuTag>태그3</NeuTag>
        </div>
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>NeuProgress / OuProgress</p>
        <NeuProgress value={65} />
      </div>
    </div>
  );
}

function MiscSection() {
  const [checked, setChecked] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [text, setText] = useState('');
  const toast = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>NeuCheckbox / OuCheckbox</p>
        <NeuCheckbox checked={checked} onChange={setChecked} label="체크박스" />
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>NeuToggle / OuToggle</p>
        <NeuToggle checked={toggled} onChange={setToggled} label="토글" />
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>NeuTextarea / OuTextarea</p>
        <NeuTextarea value={text} onChange={e => setText(e.target.value)} placeholder="텍스트를 입력하세요..." rows={3} style={{ width: 320 }} />
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>useToast</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['info', 'success', 'warning', 'error'] as const).map(type => (
            <OuButton key={type} variant="default" size="sm" onClick={() => toast.show(`${type} 메시지`, type)}>
              {type}
            </OuButton>
          ))}
        </div>
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 12 }}>NeuSectionTitle / OuSectionTitle</p>
        <NeuSectionTitle>섹션 제목</NeuSectionTitle>
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────
function DSPage() {
  const [section, setSection] = useState<Section>('tokens');
  const [palette, setPalette] = useState<Palette>('cosmos');

  const handlePalette = (p: Palette) => {
    setPalette(p);
    document.documentElement.setAttribute('data-palette', p);
  };

  const SECTION_MAP: Record<Section, React.ReactNode> = {
    tokens: <TokenSection />,
    button: <ButtonSection />,
    card: <CardSection />,
    input: <InputSection />,
    modal: <ModalSection />,
    avatar: <AvatarSection />,
    divider: <DividerSection />,
    tabs: <TabsSection />,
    badge: <BadgeSection />,
    misc: <MiscSection />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ou-space)' }}>
      {/* 좌측 네비 */}
      <aside style={{
        width: 200,
        flexShrink: 0,
        borderRight: '1px solid var(--ou-glass-border)',
        padding: '24px 0',
        background: 'var(--ou-surface)',
        boxShadow: 'var(--ou-shadow-sm)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--ou-glass-border)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ou-text-heading)' }}>OU Design System</span>
          <p style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginTop: 2 }}>Light Industrial Monochrome</p>
        </div>

        {/* 팔레트 스위처 */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ou-glass-border)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ou-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Palette</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PALETTES.map(p => (
              <button
                key={p}
                onClick={() => handlePalette(p)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--ou-radius-xs)',
                  fontSize: 11,
                  fontFamily: 'var(--ou-font-body)',
                  border: `1px solid ${palette === p ? 'var(--ou-accent)' : 'var(--ou-glass-border)'}`,
                  background: palette === p ? 'var(--ou-accent)' : 'transparent',
                  color: palette === p ? '#fff' : 'var(--ou-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all var(--ou-transition-fast)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 섹션 네비 */}
        <nav style={{ padding: '12px 0' }}>
          {SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 20px',
                fontSize: 13,
                fontFamily: 'var(--ou-font-body)',
                background: section === s ? 'rgba(0,0,0,0.05)' : 'transparent',
                borderLeft: `3px solid ${section === s ? 'var(--ou-accent)' : 'transparent'}`,
                border: 'none',
                borderRight: 'none',
                borderTop: 'none',
                borderBottom: 'none',
                color: section === s ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
                fontWeight: section === s ? 600 : 400,
                cursor: 'pointer',
                transition: 'all var(--ou-transition-fast)',
              }}
            >
              {SECTION_LABELS[s]}
            </button>
          ))}
        </nav>
      </aside>

      {/* 우측 콘텐츠 */}
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'var(--ou-text-xl)', fontWeight: 700, color: 'var(--ou-text-heading)', marginBottom: 4 }}>
            {SECTION_LABELS[section]}
          </h1>
          <OuDivider />
        </div>
        {SECTION_MAP[section]}
      </main>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <ToastProvider>
      <DSPage />
    </ToastProvider>
  );
}
