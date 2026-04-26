'use client';

import { useState } from 'react';
import { Section, Grid } from './_shared';
import {
  OuCard, OuButton, OuInput, OuBadge, OuTag, OuCheckbox, OuToggle,
  OuSelect, OuSlider, OuProgress, OuSkeleton, OuAvatar, OuTabs,
  OuNavItem, OuDivider, OuSectionTitle, OuCircleDisplay, OuNotificationBadge, OuIconButton,
} from '@/components/ds';

export function BlocksSections() {
  return (
    <>
      <CardSection />
      <ButtonSection />
      <InputSection />
      <SelectionSection />
      <FeedbackSection />
      <DisplaySection />
      <NavigationSection />
      <ChatSection />
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CardSection() {
  return (
    <Section
      title="OuCard — variants"
      note="우주에 떠 있는 것들. 배경색 없음, 테두리와 글로우로만 형태를 드러냄."
    >
      <Grid cols={3} gap={20}>
        <OuCard variant="floating">
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 8 }}>floating (기본)</div>
          <div style={{ fontFamily: 'var(--ou-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ou-text-heading)', marginBottom: 4 }}>Just talk.</div>
          <div style={{ fontFamily: 'var(--ou-font-display)', fontSize: 12, color: 'var(--ou-text-secondary)' }}>own universe</div>
        </OuCard>

        <OuCard variant="glass">
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 8 }}>glass</div>
          <div style={{ fontFamily: 'var(--ou-font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ou-text-heading)', marginBottom: 4 }}>Just talk.</div>
          <div style={{ fontFamily: 'var(--ou-font-display)', fontSize: 12, color: 'var(--ou-text-secondary)' }}>own universe</div>
        </OuCard>

        <OuCard variant="white">
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.40)', marginBottom: 8 }}>white</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#000', marginBottom: 4 }}>Just talk.</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>별처럼 존재하는 흰 카드</div>
        </OuCard>

        <OuCard variant="ghost">
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 8 }}>ghost</div>
          <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>테두리만, 글로우 없음</div>
        </OuCard>

        <OuCard variant="pill" padding="12px 20px">
          <span style={{ fontSize: 13, color: 'var(--ou-text-body)' }}>pill — 가로 컴팩트</span>
          <span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>→</span>
        </OuCard>

        <OuCard variant="floating" hoverable>
          <div style={{ fontSize: 11, color: 'var(--ou-text-muted)', marginBottom: 8 }}>hoverable</div>
          <div style={{ fontSize: 13, color: 'var(--ou-text-body)' }}>호버 시 위로 올라옴</div>
        </OuCard>
      </Grid>

      {/* 콘텐츠 카드 예시 (레퍼런스 이미지 스타일) */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 16 }}>콘텐츠 카드 예시</div>
        <Grid cols={3} gap={16}>
          <OuCard variant="white">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 12 }}>오늘의 일정</div>
            <div style={{ fontFamily: 'var(--ou-font-display)', fontSize: 24, fontWeight: 700, color: '#0a0a0a', marginBottom: 10 }}>APR 26</div>
            {[['09:00', '수업'], ['15:00', '스터디'], ['20:00', '운동']].map(([t, n]) => (
              <div key={t} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'rgba(0,0,0,0.65)', paddingBottom: 6 }}>
                <span style={{ fontFamily: 'var(--ou-font-mono)', fontSize: 12, color: '#000', minWidth: 44 }}>{t}</span>{n}
              </div>
            ))}
          </OuCard>

          <OuCard variant="floating">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ou-text-muted)', marginBottom: 12 }}>오늘의 일정</div>
            <div style={{ fontFamily: 'var(--ou-font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ou-text-heading)', marginBottom: 10 }}>APR 26</div>
            {[['09:00', '수업'], ['15:00', '스터디'], ['20:00', '운동']].map(([t, n]) => (
              <div key={t} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--ou-text-secondary)', paddingBottom: 6 }}>
                <span style={{ fontFamily: 'var(--ou-font-mono)', fontSize: 12, color: 'var(--ou-text-strong)', minWidth: 44 }}>{t}</span>{n}
              </div>
            ))}
          </OuCard>

          <OuCard variant="glass">
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ou-text-muted)', marginBottom: 12 }}>이번 달 습관</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--ou-font-display)', fontSize: 40, fontWeight: 700, color: 'var(--ou-text-heading)' }}>27</span>
              <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>일 연속</span>
            </div>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 8 }}>
              {Array.from({ length: 26 }, (_, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: i < 22 ? 'var(--ou-text-strong)' : 'var(--ou-surface-muted)' }} />
              ))}
            </div>
          </OuCard>
        </Grid>
      </div>
    </Section>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

function ButtonSection() {
  const [loading, setLoading] = useState(false);
  return (
    <Section title="OuButton — variants & sizes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <OuButton variant="default">Default</OuButton>
          <OuButton variant="accent">Accent</OuButton>
          <OuButton variant="ghost">Ghost</OuButton>
          <OuButton variant="danger">Danger</OuButton>
          <OuButton variant="default" disabled>Disabled</OuButton>
          <OuButton
            variant="accent"
            loading={loading}
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 2000); }}
          >
            {loading ? '처리 중...' : 'Loading (클릭)'}
          </OuButton>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <OuButton size="sm">Small</OuButton>
          <OuButton size="md">Medium (기본)</OuButton>
          <OuButton size="lg">Large</OuButton>
        </div>
        <OuButton variant="accent" fullWidth>Full Width</OuButton>
      </div>
    </Section>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

function InputSection() {
  return (
    <Section title="OuInput — sizes & states">
      <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <OuInput size="sm" placeholder="Small" label="Small" />
        <OuInput size="md" placeholder="Medium (기본)" label="Medium" />
        <OuInput size="lg" placeholder="Large" label="Large" />
        <OuInput placeholder="오류 상태" label="Error" error="필수 입력 항목입니다" />
        <OuInput
          placeholder="검색"
          prefix={<span style={{ fontSize: 14 }}>🔍</span>}
          suffix={<span style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>⌘K</span>}
        />
      </div>
    </Section>
  );
}

// ─── Selection ────────────────────────────────────────────────────────────────

function SelectionSection() {
  const [checked, setChecked] = useState(false);
  const [toggled, setToggled] = useState(true);
  const [sliderVal, setSliderVal] = useState(60);
  const [selectVal, setSelectVal] = useState('');
  const [activeTab, setActiveTab] = useState('schedule');

  return (
    <Section title="Selection — Checkbox / Toggle / Select / Slider / Tabs">
      <Grid cols={2} gap={32}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <OuSectionTitle>Checkbox</OuSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <OuCheckbox checked={checked} onChange={setChecked} label="완료하지 않음" />
              <OuCheckbox checked={!checked} onChange={(v) => setChecked(!v)} label="완료됨" />
              <OuCheckbox checked={false} onChange={() => {}} label="비활성" disabled />
            </div>
          </div>

          <div>
            <OuSectionTitle>Toggle</OuSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <OuToggle checked={toggled} onChange={setToggled} label="알림 활성화" />
              <OuToggle checked={!toggled} onChange={(v) => setToggled(!v)} label="다크 모드" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <OuSectionTitle>Select</OuSectionTitle>
            <div style={{ marginTop: 12 }}>
              <OuSelect
                value={selectVal}
                onChange={setSelectVal}
                options={[
                  { value: 'schedule', label: '일정' },
                  { value: 'task', label: '할일' },
                  { value: 'habit', label: '습관' },
                  { value: 'journal', label: '일기' },
                ]}
                placeholder="도메인 선택"
              />
            </div>
          </div>

          <div>
            <OuSectionTitle>Slider</OuSectionTitle>
            <div style={{ marginTop: 12 }}>
              <OuSlider value={sliderVal} onChange={setSliderVal} />
              <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginTop: 8 }}>값: {sliderVal}</div>
            </div>
          </div>
        </div>
      </Grid>

      <div style={{ marginTop: 32 }}>
        <OuSectionTitle>Tabs</OuSectionTitle>
        <div style={{ marginTop: 12 }}>
          <OuTabs
            tabs={[
              { key: 'schedule', label: '일정' },
              { key: 'task', label: '할일' },
              { key: 'habit', label: '습관' },
              { key: 'journal', label: '일기' },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ou-text-secondary)' }}>
            선택됨: {activeTab}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

function FeedbackSection() {
  return (
    <Section title="Feedback — Badge / Tag / Progress / Skeleton">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <OuSectionTitle>Badge & Tag</OuSectionTitle>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
            <OuBadge>일정</OuBadge>
            <OuBadge accent>강조 뱃지</OuBadge>
            <OuTag>할일</OuTag>
            <OuTag>습관</OuTag>
            <OuTag>일기</OuTag>
          </div>
        </div>

        <div>
          <OuSectionTitle>Progress</OuSectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, maxWidth: 400 }}>
            <OuProgress value={30} size="sm" />
            <OuProgress value={60} size="md" showLabel />
            <OuProgress value={85} size="lg" showLabel />
          </div>
        </div>

        <div>
          <OuSectionTitle>Skeleton</OuSectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, maxWidth: 320 }}>
            <OuSkeleton width="60%" height={20} />
            <OuSkeleton width="100%" height={14} />
            <OuSkeleton width="80%" height={14} />
          </div>
        </div>

        <div>
          <OuSectionTitle>NotificationBadge & IconButton</OuSectionTitle>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 12 }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <OuIconButton aria-label="알림" variant="ghost" icon={
                <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a5 5 0 00-5 5v3l-1 2h12l-1-2V6a5 5 0 00-5-5zm0 13a2 2 0 002-2H6a2 2 0 002 2z"/>
                </svg>
              } />
              <OuNotificationBadge count={3} />
            </div>
            <OuIconButton aria-label="설정" variant="ghost" icon={
              <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
                <path d="M7 1h2l.5 2 1.5.9 2-.5 1 1.7-1.5 1.4v1.8l1.5 1.4-1 1.7-2-.5L9.5 12 9 14H7l-.5-2-1.5-.9-2 .5-1-1.7L3.5 8.6V6.8L2 5.4l1-1.7 2 .5L6.5 3 7 1zm1 4a3 3 0 100 6A3 3 0 008 5z"/>
              </svg>
            } />
            <OuIconButton aria-label="검색" variant="solid" icon={
              <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.5 1a5.5 5.5 0 014.2 9l3.2 3.2-1 1L9.5 11A5.5 5.5 0 116.5 1zm0 1.5a4 4 0 100 8 4 4 0 000-8z"/>
              </svg>
            } />
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Display ──────────────────────────────────────────────────────────────────

function DisplaySection() {
  return (
    <Section title="Display — Avatar / CircleDisplay / Divider / SectionTitle">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <OuSectionTitle>Avatar</OuSectionTitle>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
            <OuAvatar name="김철수" size={32} />
            <OuAvatar name="이영희" size={40} />
            <OuAvatar name="박지원" size={52} />
            <OuAvatar src="https://api.dicebear.com/7.x/shapes/svg?seed=ou" size={40} />
          </div>
        </div>

        <div>
          <OuSectionTitle>CircleDisplay</OuSectionTitle>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12 }}>
            <OuCircleDisplay value="27" label="연속" size="sm" />
            <OuCircleDisplay value="94%" label="완료율" size="md" />
            <OuCircleDisplay value="∞" label="우주" size="lg" />
          </div>
        </div>

        <div>
          <OuSectionTitle>Divider</OuSectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <OuDivider />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 40 }}>
              <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>좌측</span>
              <OuDivider vertical />
              <span style={{ fontSize: 13, color: 'var(--ou-text-secondary)' }}>우측</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

// 이모지 아이콘 절대 사용 금지 — SVG/벡터만. CLAUDE.md §9 참조.
const NAV_ICON_SIZE = 16;
function NavIcon({ d }: { d: string }) {
  return (
    <svg width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} viewBox="0 0 16 16" fill="currentColor">
      <path d={d} />
    </svg>
  );
}

function NavigationSection() {
  const [activeNav, setActiveNav] = useState('home');
  return (
    <Section title="Navigation — NavItem">
      <div style={{ maxWidth: 200, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[
          { key: 'home',     icon: <NavIcon d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z" />,            label: '홈' },
          { key: 'schedule', icon: <NavIcon d="M2 2h12v12H2V2zm1 4h10v7H3V6zm2-3v2h1V3H5zm5 0v2h1V3h-1z" />, label: '일정' },
          { key: 'task',     icon: <NavIcon d="M2 8h5v1H2V8zm0-3h7v1H2V5zm0 6h4v1H2v-1zm7-1l-1.5 1.5L9 12l3-3-1-1-2 2z" />, label: '할일' },
          { key: 'habit',    icon: <NavIcon d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 2a3 3 0 100 6A3 3 0 008 5z" />, label: '습관' },
          { key: 'journal',  icon: <NavIcon d="M3 1h8l2 2v12H3V1zm1 1v12h8V4l-1-1H4zm2 3h5v1H6V5zm0 3h5v1H6V8zm0 3h3v1H6v-1z" />,  label: '일기' },
        ].map(({ key, icon, label }) => (
          <OuNavItem
            key={key}
            icon={icon}
            active={activeNav === key}
            onClick={() => setActiveNav(key)}
          >
            {label}
          </OuNavItem>
        ))}
      </div>
    </Section>
  );
}

// ─── Chat (Bubble) ────────────────────────────────────────────────────────────

function ChatSection() {
  return (
    <Section title="Chat Bubble">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
        <div style={{
          padding: '12px 16px',
          maxWidth: '70%',
          marginLeft: 'auto',
          background: 'var(--ou-surface-subtle)',
          border: '1px solid var(--ou-border-medium)',
          borderRadius: '20px 20px 4px 20px',
          boxShadow: 'var(--ou-glow-md)',
          fontSize: 13,
          color: 'var(--ou-text-bright)',
        }}>
          내일 3시에 미팅 잡아줘
        </div>

        <div style={{
          padding: '12px 16px',
          maxWidth: '90%',
          borderLeft: '1.5px solid var(--ou-border-muted)',
          paddingLeft: 14,
          fontSize: 13,
          lineHeight: 1.8,
          color: 'var(--ou-text-body)',
        }}>
          내일 오후 3시 미팅을 일정에 추가했습니다. 장소나 참석자가 있으면 알려주세요.
        </div>

        <OuCard variant="floating" padding="12px 16px" style={{ maxWidth: '60%' }}>
          <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>저장된 일정</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-strong)' }}>미팅</div>
          <div style={{ fontSize: 12, color: 'var(--ou-text-secondary)', marginTop: 4 }}>내일 · 오후 3:00</div>
        </OuCard>
      </div>
    </Section>
  );
}
