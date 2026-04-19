'use client';

import { useState } from 'react';
import {
  NeuCard,
  NeuButton,
  NeuInput,
  NeuTextarea,
  NeuCheckbox,
  NeuToggle,
  NeuTabs,
  NeuProgress,
  NeuBadge,
  NeuAvatar,
  NeuCircleDisplay,
  NeuToast,
  NeuSlider,
  NeuTag,
  NeuNavItem,
  NeuSearchBar,
  NeuDivider,
  NeuSectionTitle,
  NeuNotificationBadge,
} from '@/components/ds';
import { OuLoader } from '@/components/ui/OuLoader';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <NeuSectionTitle>{title}</NeuSectionTitle>
      {children}
    </div>
  );
}

function Row({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap, alignItems: 'center' }}>{children}</div>;
}

function Grid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20 }}>{children}</div>;
}

export default function DSPage() {
  const [checks, setChecks] = useState([true, true, false, false]);
  const [toggles, setToggles] = useState([false, true, true]);
  const [activeTab, setActiveTab] = useState(0);
  const [activeNav, setActiveNav] = useState(0);
  const [slider, setSlider] = useState(65);

  const toggleCheck = (i: number) => {
    const next = [...checks];
    next[i] = !next[i];
    setChecks(next);
  };

  const toggleToggle = (i: number) => {
    const next = [...toggles];
    next[i] = !next[i];
    setToggles(next);
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 32px 100px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          fontFamily: 'var(--ou-font-logo)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--ou-text-heading)',
          letterSpacing: 3,
        }}>
          OU Design System
        </h1>
        <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginTop: 4, letterSpacing: 1 }}>
          Neumorphism Components — Live Preview
        </p>
      </div>

      {/* Cards */}
      <Section title="NeuCard">
        <Grid>
          <NeuCard>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ou-text-heading)', marginBottom: 6 }}>Raised</div>
            <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)' }}>기본 카드. 호버 시 깊어짐</div>
          </NeuCard>
          <NeuCard variant="pressed">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ou-text-heading)', marginBottom: 6 }}>Pressed</div>
            <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)' }}>오목. 인풋, 활성 패널</div>
          </NeuCard>
          <NeuCard variant="flat">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ou-text-heading)', marginBottom: 6 }}>Flat</div>
            <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)' }}>그림자 없음</div>
          </NeuCard>
        </Grid>
      </Section>

      {/* Buttons */}
      <Section title="NeuButton">
        <Row>
          <NeuButton>Default</NeuButton>
          <NeuButton variant="accent">Accent</NeuButton>
          <NeuButton variant="ghost">Ghost</NeuButton>
          <NeuButton size="sm">Small</NeuButton>
          <NeuButton size="lg">Large</NeuButton>
          <NeuButton disabled>Disabled</NeuButton>
        </Row>
        <div style={{ marginTop: 12 }}>
          <NeuButton variant="accent" fullWidth>Full Width Accent</NeuButton>
        </div>
      </Section>

      {/* Inputs */}
      <Section title="NeuInput & NeuTextarea">
        <Grid cols={2}>
          <NeuInput label="이름" placeholder="입력하세요..." />
          <NeuInput label="이메일" placeholder="email@example.com" size="sm" />
        </Grid>
        <div style={{ marginTop: 16 }}>
          <NeuTextarea label="메모" placeholder="여러 줄 입력..." />
        </div>
      </Section>

      {/* Search Bar */}
      <Section title="NeuSearchBar">
        <NeuSearchBar
          placeholder="Just talk..."
          icon={<span style={{ fontSize: 18 }}>&#8981;</span>}
          trailing={
            <span style={{
              fontFamily: 'var(--ou-font-mono)',
              fontSize: 10,
              color: 'var(--ou-text-muted)',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-xs)',
              padding: '3px 8px',
              borderRadius: 4,
            }}>
              &#8984;K
            </span>
          }
          style={{ maxWidth: 480 }}
        />
      </Section>

      {/* Checkbox */}
      <Section title="NeuCheckbox">
        <p style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 12 }}>
          raised = 미완료 (눌러!) &rarr; pressed = 완료 (이미 됨)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <NeuCheckbox checked={checks[0]} onChange={() => toggleCheck(0)} label="디자인 토큰 정의" />
          <NeuCheckbox checked={checks[1]} onChange={() => toggleCheck(1)} label="팔레트 리서치" />
          <NeuCheckbox checked={checks[2]} onChange={() => toggleCheck(2)} label="컴포넌트 구현" />
          <NeuCheckbox checked={checks[3]} onChange={() => toggleCheck(3)} label="접근성 검증" />
        </div>
      </Section>

      {/* Toggle */}
      <Section title="NeuToggle">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <NeuToggle checked={toggles[0]} onChange={() => toggleToggle(0)} label="Dark Mode" />
          <NeuToggle checked={toggles[1]} onChange={() => toggleToggle(1)} label="알림" />
          <NeuToggle checked={toggles[2]} onChange={() => toggleToggle(2)} label="자동 기록" />
        </div>
      </Section>

      {/* Tabs */}
      <Section title="NeuTabs">
        <Row>
          <NeuTabs tabs={['All', '내 데이터', '최근', 'Views']} active={activeTab} onChange={setActiveTab} />
        </Row>
        <div style={{ marginTop: 8 }}>
          <NeuTabs tabs={['Small', 'Tabs']} active={0} size="sm" />
        </div>
      </Section>

      {/* Progress & Slider */}
      <Section title="NeuProgress & NeuSlider">
        <Grid cols={2}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 8 }}>Progress 72%</div>
            <NeuProgress value={72} />
            <div style={{ marginTop: 12 }}>
              <NeuProgress value={45} size="lg" showLabel />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 8 }}>Slider {slider}%</div>
            <NeuSlider value={slider} />
          </div>
        </Grid>
      </Section>

      {/* Badge & Tag */}
      <Section title="NeuBadge & NeuTag">
        <Row>
          <NeuBadge>Default</NeuBadge>
          <NeuBadge accent>Active</NeuBadge>
          <NeuBadge>24개 용어</NeuBadge>
          <NeuTag>한의학</NeuTag>
          <NeuTag>역사</NeuTag>
          <NeuTag>개발</NeuTag>
        </Row>
      </Section>

      {/* Avatar */}
      <Section title="NeuAvatar">
        <Row gap={16}>
          <NeuAvatar size="sm">K</NeuAvatar>
          <NeuAvatar>K</NeuAvatar>
          <NeuAvatar size="lg">K</NeuAvatar>
          <NeuAvatar accent>OU</NeuAvatar>
          <NeuAvatar size="lg" accent>OU</NeuAvatar>
        </Row>
      </Section>

      {/* Circle Display */}
      <Section title="NeuCircleDisplay">
        <Row gap={32}>
          <NeuCircleDisplay value="42" label="내 데이터" size="sm" />
          <NeuCircleDisplay value="87%" label="정확도" />
          <NeuCircleDisplay value="7" label="도메인" size="lg" />
        </Row>
      </Section>

      {/* Nav Items */}
      <Section title="NeuNavItem">
        <NeuCard style={{ maxWidth: 260, padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['Orb', 'My Universe', 'Settings', 'Admin'].map((item, i) => (
              <NeuNavItem key={item} active={i === activeNav} onClick={() => setActiveNav(i)}>
                {item}
              </NeuNavItem>
            ))}
          </div>
        </NeuCard>
      </Section>

      {/* Toast */}
      <Section title="NeuToast">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NeuToast time="방금">데이터가 생성되었습니다</NeuToast>
          <NeuToast time="2분 전" accent={false}>대화가 기록되었습니다</NeuToast>
        </div>
      </Section>

      {/* Notification Badge */}
      <Section title="NeuNotificationBadge">
        <Row gap={20}>
          <div style={{ position: 'relative' }}>
            <NeuAvatar>S</NeuAvatar>
            <div style={{ position: 'absolute', top: -4, right: -4 }}>
              <NeuNotificationBadge count={3} />
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <NeuAvatar>M</NeuAvatar>
            <div style={{ position: 'absolute', top: -4, right: -4 }}>
              <NeuNotificationBadge count={12} />
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <NeuAvatar>J</NeuAvatar>
            <div style={{ position: 'absolute', top: -4, right: -4 }}>
              <NeuNotificationBadge count={150} />
            </div>
          </div>
        </Row>
      </Section>

      {/* Divider */}
      <Section title="NeuDivider">
        <NeuCard>
          <div style={{ fontSize: 13, color: 'var(--ou-text-strong)' }}>위 콘텐츠</div>
          <NeuDivider />
          <div style={{ fontSize: 13, color: 'var(--ou-text-strong)' }}>아래 콘텐츠</div>
        </NeuCard>
      </Section>

      {/* Combined Example */}
      <Section title="Combined — Todo Widget">
        <NeuCard style={{ maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ou-text-heading)' }}>My Tasks</span>
            <NeuBadge accent>2/4</NeuBadge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <NeuCheckbox checked={checks[0]} onChange={() => toggleCheck(0)} label="디자인 토큰 정의" />
            <NeuCheckbox checked={checks[1]} onChange={() => toggleCheck(1)} label="팔레트 리서치" />
            <NeuCheckbox checked={checks[2]} onChange={() => toggleCheck(2)} label="컴포넌트 구현" />
            <NeuCheckbox checked={checks[3]} onChange={() => toggleCheck(3)} label="접근성 검증" />
          </div>
          <div style={{ marginTop: 16 }}>
            <NeuProgress value={50} showLabel />
          </div>
        </NeuCard>
      </Section>

      {/* Loader */}
      <Section title="OuLoader">
        <Row gap={32}>
          <div style={{ textAlign: 'center' }}>
            <OuLoader size={48} />
            <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 8 }}>48px</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <OuLoader size={80} />
            <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 8 }}>80px</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <OuLoader size={120} />
            <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginTop: 8 }}>120px</div>
          </div>
        </Row>
      </Section>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 2, marginTop: 40 }}>
        OU — NEUMORPHISM DESIGN SYSTEM
      </div>
    </div>
  );
}
