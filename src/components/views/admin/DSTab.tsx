'use client';

import { useState } from 'react';
import {
  OuCard, OuButton, OuInput, OuTabs,
  OuModal, OuAvatar, OuDivider, OuSkeleton,
  useToast,
} from '@/components/ds';

// ─────────────────────────────────────────────────────────
// 섹션 래퍼
// ─────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ou-text-muted)',
        marginBottom: 20, paddingBottom: 10,
        borderBottom: '1px solid var(--ou-glass-border)',
      }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ou-text-secondary)', marginBottom: 12, marginTop: 24 }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 컬러 스워치
// ─────────────────────────────────────────────────────────
function Swatch({ label, varName, value }: { label: string; varName: string; value?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100 }}>
      <div style={{
        height: 48, borderRadius: 'var(--ou-radius-sm)',
        background: `var(${varName})`,
        border: '1px solid var(--ou-glass-border)',
        boxShadow: 'var(--ou-shadow-sm)',
      }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ou-text-body)' }}>{label}</div>
      <div style={{
        fontSize: 10, color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-mono)',
        wordBreak: 'break-all', lineHeight: 1.4,
      }}>
        {varName}
      </div>
      {value && <div style={{ fontSize: 10, color: 'var(--ou-text-disabled)', fontFamily: 'var(--ou-font-mono)' }}>{value}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 텍스트 계층 행
// ─────────────────────────────────────────────────────────
function TextRow({ level, varName, sample }: { level: string; varName: string; sample: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--ou-glass-border)' }}>
      <div style={{ width: 80, fontSize: 10, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)', flexShrink: 0 }}>{level}</div>
      <div style={{ flex: 1, color: `var(${varName})`, fontSize: 14 }}>{sample}</div>
      <div style={{ fontSize: 10, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-disabled)' }}>{varName}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 반지름 샘플
// ─────────────────────────────────────────────────────────
function RadiusSample({ label, varName }: { label: string; varName: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div style={{
        width: 56, height: 56, background: 'var(--ou-glass-strong)',
        border: '1px solid var(--ou-glass-border)',
        borderRadius: `var(${varName})`,
        boxShadow: 'var(--ou-shadow-sm)',
      }} />
      <div style={{ fontSize: 10, color: 'var(--ou-text-secondary)', textAlign: 'center', fontFamily: 'var(--ou-font-mono)' }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 그림자 샘플
// ─────────────────────────────────────────────────────────
function ShadowSample({ label, varName }: { label: string; varName: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <div style={{
        width: 80, height: 64, background: 'var(--ou-glass-strong)',
        borderRadius: 'var(--ou-radius-card)',
        boxShadow: `var(${varName})`,
      }} />
      <div style={{ fontSize: 10, color: 'var(--ou-text-secondary)', fontFamily: 'var(--ou-font-mono)' }}>{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 메인 DS 탭
// ─────────────────────────────────────────────────────────
export function DSTab() {
  const { show } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [inputError, setInputError] = useState('');
  const [animKey, setAnimKey] = useState(0);
  const [tabKey, setTabKey] = useState('a');

  return (
    <div style={{ padding: '32px 40px 80px', maxWidth: 960, margin: '0 auto' }}>

      {/* ── 헤더 ─────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ou-text-muted)', marginBottom: 8 }}>
          Own Universe
        </div>
        <h1 style={{ fontSize: 'var(--ou-text-2xl)', fontWeight: 800, color: 'var(--ou-text-heading)', letterSpacing: '-0.03em', margin: 0 }}>
          Design System
        </h1>
        <p style={{ marginTop: 8, fontSize: 'var(--ou-text-sm)', color: 'var(--ou-text-secondary)' }}>
          Light Industrial Monochrome · 토큰 · 컴포넌트 · 레이아웃 레퍼런스
        </p>
      </div>

      {/* ── 1. 컬러 ─────────────────────────────── */}
      <Section title="Colors">

        <SubTitle>Space (배경)</SubTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Swatch label="Space" varName="--ou-space" value="#e4e4ea" />
          <Swatch label="Space Subtle" varName="--ou-space-subtle" value="#dcdce2" />
        </div>

        <SubTitle>Surface (카드)</SubTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Swatch label="Glass" varName="--ou-glass" value="rgba(255,255,255,0.70)" />
          <Swatch label="Glass Hover" varName="--ou-glass-hover" value="rgba(255,255,255,0.85)" />
          <Swatch label="Glass Active" varName="--ou-glass-active" value="rgba(255,255,255,0.95)" />
          <Swatch label="Glass Elevated" varName="--ou-glass-elevated" value="rgba(255,255,255,0.90)" />
          <Swatch label="Glass Strong" varName="--ou-glass-strong" value="rgba(255,255,255,1.0)" />
        </div>

        <SubTitle>Dark Card (강조)</SubTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Swatch label="Card Dark" varName="--ou-card-dark" value="#1a1a1f" />
          <Swatch label="Card Dark Hover" varName="--ou-card-dark-hover" value="#252528" />
        </div>

        <SubTitle>Semantic</SubTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Swatch label="Success" varName="--ou-success" value="#16a34a" />
          <Swatch label="Warning" varName="--ou-warning" value="#ca8a04" />
          <Swatch label="Error" varName="--ou-error" value="#dc2626" />
          <Swatch label="Info" varName="--ou-info" value="#2563eb" />
        </div>

        <SubTitle>Text 계층 (6단계)</SubTitle>
        <div style={{ borderRadius: 'var(--ou-radius-card)', overflow: 'hidden', border: '1px solid var(--ou-glass-border)' }}>
          <TextRow level="heading" varName="--ou-text-heading" sample="제목 텍스트 — rgba(0,0,0,0.90)" />
          <TextRow level="strong" varName="--ou-text-strong" sample="강조 텍스트 — rgba(0,0,0,0.78)" />
          <TextRow level="body" varName="--ou-text-body" sample="본문 텍스트 — rgba(0,0,0,0.62)" />
          <TextRow level="secondary" varName="--ou-text-secondary" sample="보조 텍스트 — rgba(0,0,0,0.42)" />
          <TextRow level="muted" varName="--ou-text-muted" sample="흐릿한 텍스트 — rgba(0,0,0,0.26)" />
          <TextRow level="disabled" varName="--ou-text-disabled" sample="비활성 텍스트 — rgba(0,0,0,0.14)" />
        </div>
      </Section>

      {/* ── 2. 타이포그래피 ─────────────────────── */}
      <Section title="Typography">

        <SubTitle>폰트 패밀리</SubTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Logo (Orbitron)', var: '--ou-font-logo', sample: 'OU — Own Universe' },
            { label: 'Display (DM Sans)', var: '--ou-font-display', sample: 'Just talk. 대화가 곧 데이터.' },
            { label: 'Body (Pretendard)', var: '--ou-font-body', sample: '말하는 순간 데이터가 됩니다. The quick brown fox.' },
            { label: 'Mono (JetBrains Mono)', var: '--ou-font-mono', sample: 'const ou = "universe"; // 09:40' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'baseline', gap: 20, padding: '12px 0', borderBottom: '1px solid var(--ou-glass-border)' }}>
              <div style={{ width: 180, fontSize: 10, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)', flexShrink: 0 }}>{f.label}</div>
              <div style={{ fontFamily: `var(${f.var})`, fontSize: 15, color: 'var(--ou-text-body)' }}>{f.sample}</div>
            </div>
          ))}
        </div>

        <SubTitle>사이즈 스케일</SubTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: 'xs · 12px', var: '--ou-text-xs' },
            { label: 'sm · 14px', var: '--ou-text-sm' },
            { label: 'base · 16px', var: '--ou-text-base' },
            { label: 'lg · 18px', var: '--ou-text-lg' },
            { label: 'xl · 24px', var: '--ou-text-xl' },
            { label: '2xl · 32px', var: '--ou-text-2xl' },
            { label: '3xl · 48px', var: '--ou-text-3xl' },
            { label: 'hero · 64px', var: '--ou-text-hero' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <div style={{ width: 100, fontSize: 10, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)', flexShrink: 0 }}>{s.label}</div>
              <div style={{ fontSize: `var(${s.var})`, color: 'var(--ou-text-heading)', lineHeight: 1.2, fontWeight: 500 }}>
                Just talk.
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. 스페이싱 & 래디어스 ──────────────── */}
      <Section title="Spacing & Radius">

        <SubTitle>스페이싱 스케일 (8px 베이스)</SubTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            [1,4],[2,8],[3,12],[4,16],[5,20],[6,24],[8,32],[10,40],[12,48],[16,64],[20,80],
          ].map(([n, px]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 60, fontSize: 10, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)' }}>
                space-{n} · {px}px
              </div>
              <div style={{
                height: 16, width: px,
                background: 'var(--ou-card-dark)',
                borderRadius: 2,
              }} />
            </div>
          ))}
        </div>

        <SubTitle>Border Radius</SubTitle>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <RadiusSample label="xs · 4px" varName="--ou-radius-xs" />
          <RadiusSample label="sm · 6px" varName="--ou-radius-sm" />
          <RadiusSample label="md · 10px" varName="--ou-radius-md" />
          <RadiusSample label="card · 14px" varName="--ou-radius-card" />
          <RadiusSample label="lg · 16px" varName="--ou-radius-lg" />
          <RadiusSample label="xl · 20px" varName="--ou-radius-xl" />
          <RadiusSample label="pill · ∞" varName="--ou-radius-pill" />
        </div>
      </Section>

      {/* ── 4. 그림자 ─────────────────────────── */}
      <Section title="Shadow & Elevation">
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <ShadowSample label="shadow-sm" varName="--ou-shadow-sm" />
          <ShadowSample label="shadow-md" varName="--ou-shadow-md" />
          <ShadowSample label="shadow-lg" varName="--ou-shadow-lg" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 80, height: 64, background: 'var(--ou-glass-strong)',
              borderRadius: 'var(--ou-radius-card)',
              boxShadow: 'var(--ou-neu-pressed-sm)',
            }} />
            <div style={{ fontSize: 10, color: 'var(--ou-text-secondary)', fontFamily: 'var(--ou-font-mono)' }}>pressed-sm</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{
              width: 80, height: 64, background: 'var(--ou-glass-strong)',
              borderRadius: 'var(--ou-radius-card)',
              boxShadow: 'var(--ou-neu-pressed-md)',
            }} />
            <div style={{ fontSize: 10, color: 'var(--ou-text-secondary)', fontFamily: 'var(--ou-font-mono)' }}>pressed-md</div>
          </div>
        </div>
      </Section>

      {/* ── 5. 트랜지션 ───────────────────────── */}
      <Section title="Transition & Animation">
        <SubTitle>트랜지션 속도</SubTitle>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'fast · 120ms', var: '--ou-transition-fast' },
            { label: 'default · 200ms', var: '--ou-transition' },
            { label: 'slow · 400ms', var: '--ou-transition-slow' },
            { label: 'spring · 500ms', var: '--ou-transition-spring' },
          ].map(t => (
            <TransitionDemo key={t.label} label={t.label} transitionVar={t.var} />
          ))}
        </div>

        <SubTitle>애니메이션 클래스</SubTitle>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setAnimKey(k => k + 1)}
            style={{
              padding: '8px 16px', borderRadius: 'var(--ou-radius-md)',
              background: 'var(--ou-card-dark)', color: 'var(--ou-card-dark-text)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            ↺ 다시 실행
          </button>
          {['ou-fade-in', 'ou-scale-in', 'ou-slide-down'].map(cls => (
            <div key={`${cls}-${animKey}`} className={cls} style={{
              padding: '8px 14px', borderRadius: 'var(--ou-radius-md)',
              background: 'var(--ou-glass-strong)', border: '1px solid var(--ou-glass-border)',
              fontSize: 12, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-body)',
              boxShadow: 'var(--ou-shadow-sm)',
            }}>
              .{cls}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ou-spinner" />
            <span style={{ fontSize: 12, fontFamily: 'var(--ou-font-mono)', color: 'var(--ou-text-muted)' }}>.ou-spinner</span>
          </div>
        </div>
      </Section>

      {/* ── 6. 컴포넌트 갤러리 ───────────────── */}
      <Section title="Components">

        {/* OuCard */}
        <SubTitle>OuCard</SubTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <OuCard style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 4 }}>Default</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-heading)' }}>OuCard</div>
          </OuCard>
          <OuCard elevated style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 4 }}>Elevated</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-heading)' }}>OuCard</div>
          </OuCard>
          <OuCard hoverable style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 4 }}>Hoverable</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-heading)' }}>Hover me</div>
          </OuCard>
          {/* Dark Card */}
          <div style={{
            padding: 20, borderRadius: 'var(--ou-radius-card)',
            background: 'var(--ou-card-dark)', boxShadow: 'var(--ou-shadow-md)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--ou-card-dark-sub)', marginBottom: 4 }}>Dark Card</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-card-dark-text)' }}>강조 카드</div>
          </div>
        </div>

        {/* OuButton */}
        <SubTitle>OuButton</SubTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <OuButton size="sm">Ghost SM</OuButton>
          <OuButton size="md">Ghost MD</OuButton>
          <OuButton size="lg">Ghost LG</OuButton>
          <OuButton variant="accent" size="md">Accent</OuButton>
          <OuButton variant="danger" size="md">Danger</OuButton>
          <OuButton size="md" loading>Loading</OuButton>
        </div>

        {/* OuInput */}
        <SubTitle>OuInput</SubTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
          <OuInput label="기본 입력" placeholder="placeholder..." value={inputVal} onChange={e => setInputVal(e.target.value)} />
          <OuInput label="에러 상태" placeholder="이메일 입력..." error="올바른 이메일 주소를 입력하세요" />
          <OuInput label="Prefix / Suffix" prefix="🔍" suffix={<span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>Cmd+K</span>} placeholder="검색..." />
        </div>

        {/* OuTabs */}
        <SubTitle>OuTabs</SubTitle>
        <OuTabs
          tabs={[{ key: 'a', label: '탭 A' }, { key: 'b', label: '탭 B' }, { key: 'c', label: '탭 C' }]}
          activeKey={tabKey}
          onChange={setTabKey}
        />

        {/* OuModal */}
        <SubTitle>OuModal</SubTitle>
        <div style={{ display: 'flex', gap: 10 }}>
          <OuButton onClick={() => setModalOpen(true)}>모달 열기</OuButton>
          <OuModal open={modalOpen} onClose={() => setModalOpen(false)} title="모달 타이틀">
            <p style={{ color: 'var(--ou-text-body)', fontSize: 14 }}>
              모달 본문 내용입니다. ESC 또는 배경 클릭으로 닫을 수 있습니다.
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <OuButton size="sm" onClick={() => setModalOpen(false)}>취소</OuButton>
              <OuButton size="sm" variant="accent" onClick={() => setModalOpen(false)}>확인</OuButton>
            </div>
          </OuModal>
        </div>

        {/* OuAvatar */}
        <SubTitle>OuAvatar</SubTitle>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <OuAvatar name="Admin User" size={24} />
          <OuAvatar name="Admin User" size={32} />
          <OuAvatar name="Admin User" size={40} />
          <OuAvatar name="Admin User" size={48} glow />
          <OuAvatar name="Admin User" size={56} glow />
        </div>

        {/* OuDivider */}
        <SubTitle>OuDivider</SubTitle>
        <OuDivider />
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', height: 40, marginTop: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>왼쪽</span>
          <OuDivider vertical style={{ height: 24 }} />
          <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>오른쪽</span>
        </div>

        {/* OuSkeleton */}
        <SubTitle>OuSkeleton</SubTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320 }}>
          <OuSkeleton height={20} borderRadius="var(--ou-radius-sm)" />
          <OuSkeleton height={14} width="70%" borderRadius="var(--ou-radius-sm)" />
          <OuSkeleton height={14} width="50%" borderRadius="var(--ou-radius-sm)" />
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <OuSkeleton width={40} height={40} borderRadius="50%" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
              <OuSkeleton height={12} borderRadius="var(--ou-radius-xs)" />
              <OuSkeleton height={12} width="60%" borderRadius="var(--ou-radius-xs)" />
            </div>
          </div>
        </div>

        {/* Toast */}
        <SubTitle>GlassToast</SubTitle>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <OuButton size="sm" onClick={() => show('정보 메시지입니다', 'info')}>Info</OuButton>
          <OuButton size="sm" onClick={() => show('성공적으로 저장됐습니다', 'success')}>Success</OuButton>
          <OuButton size="sm" onClick={() => show('주의가 필요합니다', 'warning')}>Warning</OuButton>
          <OuButton size="sm" onClick={() => show('오류가 발생했습니다', 'error')}>Error</OuButton>
        </div>
      </Section>

      {/* ── 7. 유틸리티 ──────────────────────── */}
      <Section title="Utility Classes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { cls: '.ou-fade-in', desc: '페이지 진입 — 200ms fade + translateY(12px)' },
            { cls: '.ou-scale-in', desc: '팝업/카드 진입 — 200ms fade + scale(0.96→1)' },
            { cls: '.ou-slide-down', desc: '드롭다운 — 150ms fade + translateY(-8px→0)' },
            { cls: '.ou-stagger > *', desc: '자식 요소 50ms 지연 순차 진입 (최대 6개)' },
            { cls: '.ou-scroll', desc: '스크롤바 숨기기 (overflow: auto + scrollbar: none)' },
            { cls: '.ou-ellipsis', desc: '텍스트 말줄임 (overflow: hidden + text-overflow: ellipsis)' },
            { cls: '.ou-no-select', desc: '텍스트 선택 불가 (user-select: none)' },
            { cls: '.ou-spinner', desc: '20×20 회전 스피너 (accent 색상)' },
          ].map(u => (
            <div key={u.cls} style={{ display: 'flex', gap: 20, alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--ou-glass-border)' }}>
              <code style={{
                width: 200, fontSize: 11, fontFamily: 'var(--ou-font-mono)',
                color: 'var(--ou-text-body)', flexShrink: 0,
              }}>{u.cls}</code>
              <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>{u.desc}</span>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 트랜지션 데모 박스
// ─────────────────────────────────────────────────────────
function TransitionDemo({ label, transitionVar }: { label: string; transitionVar: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 80, height: 56,
          borderRadius: 'var(--ou-radius-card)',
          background: hovered ? 'var(--ou-card-dark)' : 'var(--ou-glass-strong)',
          border: '1px solid var(--ou-glass-border)',
          boxShadow: hovered ? 'var(--ou-shadow-lg)' : 'var(--ou-shadow-sm)',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          transition: `all var(${transitionVar})`,
          cursor: 'default',
        }}
      />
      <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', fontFamily: 'var(--ou-font-mono)', textAlign: 'center' }}>{label}</div>
    </div>
  );
}
