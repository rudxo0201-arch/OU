/**
 * OU Design System — Foundation (토큰 카탈로그)
 *
 * globals.css의 --ou-* 변수가 SSOT다. 이 파일은 *카탈로그·문서 메타*만 담는다.
 * 토큰 값을 직접 정의하거나 중복하지 않는다.
 *
 * KRDS Design Style 분류를 따름:
 *   Color / Typography / Shape / Layout / Elevation / Motion / Breakpoints
 */

export interface DsToken {
  name: string;
  desc: string;
}

export type DsFoundationGroup =
  | 'color' | 'typography' | 'shape' | 'layout' | 'elevation' | 'motion' | 'breakpoints';

export interface DsFoundationSection {
  group: DsFoundationGroup;
  label: string;
  tokens: DsToken[];
}

export const DS_FOUNDATION: DsFoundationSection[] = [
  {
    group: 'color',
    label: 'Color',
    tokens: [
      { name: '--ou-bg',             desc: '최저 배경 (순수 검정 #000)' },
      { name: '--ou-bg-raised',      desc: '약간 올라온 배경 레이어 (#0d0d0d)' },
      { name: '--ou-bg-elevated',    desc: '팝업·패널 배경 (#111)' },
      { name: '--ou-surface-faint',  desc: '거의 투명 표면 (0.015)' },
      { name: '--ou-surface-subtle', desc: '미세 표면 (0.03)' },
      { name: '--ou-surface-muted',  desc: '표면 중간 (0.05)' },
      { name: '--ou-surface-hover',  desc: '호버 표면 (0.08)' },
      { name: '--ou-border-faint',   desc: '아주 연한 테두리 (0.06)' },
      { name: '--ou-border-subtle',  desc: '기본 테두리 = --ou-border (0.10)' },
      { name: '--ou-border-hover',   desc: '호버 테두리 (0.25)' },
      { name: '--ou-border-focus',   desc: '포커스 테두리 (0.45)' },
      { name: '--ou-border-mid',     desc: '컨트롤 테두리 (toggle/checkbox/input, 0.40)' },
      { name: '--ou-text-heading',   desc: '제목 텍스트 (흰색)' },
      { name: '--ou-text-strong',    desc: '강한 텍스트 (0.85)' },
      { name: '--ou-text-body',      desc: '본문 텍스트 (0.70)' },
      { name: '--ou-text-secondary', desc: '보조 텍스트 (0.55)' },
      { name: '--ou-text-muted',     desc: '흐린 텍스트 (0.25)' },
      { name: '--ou-text-disabled',  desc: '비활성 텍스트 (0.18)' },
      { name: '--ou-accent',         desc: '강조 색 (흰색 — 세미틱 별칭)' },
      { name: '--ou-success',        desc: '성공 상태 색 (#7aaa88)' },
      { name: '--ou-warning',        desc: '경고 상태 색 (#aaa070)' },
      { name: '--ou-error',          desc: '에러 상태 색 (#aa7070)' },
      { name: '--ou-info',           desc: '정보 상태 색 (#7088aa)' },
    ],
  },
  {
    group: 'typography',
    label: 'Typography',
    tokens: [
      { name: '--ou-font-body',         desc: 'Pretendard Variable — 본문' },
      { name: '--ou-font-mono',         desc: 'JetBrains Mono — 코드·태그' },
      { name: '--ou-font-display',      desc: 'DM Sans — 큰 헤딩' },
      { name: '--ou-font-logo',         desc: 'Orbitron — OU 로고 전용' },
      { name: '--ou-text-micro',        desc: '10px' },
      { name: '--ou-text-xs',           desc: '12px' },
      { name: '--ou-text-sm',           desc: '14px' },
      { name: '--ou-text-base',         desc: '16px' },
      { name: '--ou-text-lg',           desc: '18px' },
      { name: '--ou-text-xl',           desc: '24px' },
      { name: '--ou-text-2xl',          desc: '32px' },
      { name: '--ou-tracking-tight',    desc: 'letter-spacing -0.02em' },
      { name: '--ou-tracking-wide',     desc: 'letter-spacing 0.05em' },
      { name: '--ou-leading-tight',     desc: 'line-height 1.15' },
      { name: '--ou-leading-normal',    desc: 'line-height 1.5' },
    ],
  },
  {
    group: 'shape',
    label: 'Shape (Border Radius)',
    tokens: [
      { name: '--ou-radius-xs',   desc: '4px — 아주 작은 요소' },
      { name: '--ou-radius-sm',   desc: '8px — 태그·뱃지' },
      { name: '--ou-radius-md',   desc: '12px — 버튼·입력필드' },
      { name: '--ou-radius-card', desc: '16px — 카드' },
      { name: '--ou-radius-lg',   desc: '20px — 큰 카드·패널' },
      { name: '--ou-radius-xl',   desc: '24px — 모달' },
      { name: '--ou-radius-pill', desc: '999px — 완전 둥근 칩·버튼' },
    ],
  },
  {
    group: 'layout',
    label: 'Layout (Spacing)',
    tokens: [
      { name: '--ou-space-1',  desc: '4px' },
      { name: '--ou-space-2',  desc: '8px' },
      { name: '--ou-space-3',  desc: '12px' },
      { name: '--ou-space-4',  desc: '16px' },
      { name: '--ou-space-5',  desc: '20px' },
      { name: '--ou-space-6',  desc: '24px' },
      { name: '--ou-space-8',  desc: '32px' },
      { name: '--ou-space-10', desc: '40px' },
      { name: '--ou-space-12', desc: '48px' },
      { name: '--ou-space-16', desc: '64px' },
    ],
  },
  {
    group: 'elevation',
    label: 'Elevation (Glow / Shadow)',
    tokens: [
      { name: '--ou-glow-xs',       desc: '아주 약한 흰 글로우' },
      { name: '--ou-glow-sm',       desc: '기본 글로우 — 카드 기본 상태' },
      { name: '--ou-glow-md',       desc: '중간 글로우 — elevated 카드' },
      { name: '--ou-glow-lg',       desc: '강한 글로우 — 중요 요소' },
      { name: '--ou-glow-hover',    desc: '호버 글로우' },
      { name: '--ou-glow-aura-sm',  desc: '아우라 효과 — 소형' },
      { name: '--ou-glow-aura-md',  desc: '아우라 효과 — 중형' },
      { name: '--ou-glow-orb',      desc: 'Orb 아이콘 글로우' },
      { name: '--ou-blur-sm',       desc: 'blur(8px)' },
      { name: '--ou-blur-md',       desc: 'blur(16px)' },
      { name: '--ou-blur-lg',       desc: 'blur(24px)' },
    ],
  },
  {
    group: 'motion',
    label: 'Motion (Transition)',
    tokens: [
      { name: '--ou-transition-fast',   desc: '120ms ease-out — 즉각 피드백' },
      { name: '--ou-transition',        desc: '200ms ease — 기본' },
      { name: '--ou-transition-slow',   desc: '400ms — 페이드·레이아웃 변화' },
      { name: '--ou-transition-spring', desc: '500ms spring — 튀는 애니메이션' },
    ],
  },
  {
    group: 'breakpoints',
    label: 'Breakpoints',
    tokens: [
      { name: '--ou-max-sm', desc: '640px' },
      { name: '--ou-max-md', desc: '768px' },
      { name: '--ou-max-lg', desc: '1024px' },
      { name: '--ou-max-xl', desc: '1280px' },
    ],
  },
];

export const DS_FOUNDATION_MAP = new Map<DsFoundationGroup, DsFoundationSection>(
  DS_FOUNDATION.map(s => [s.group, s])
);
