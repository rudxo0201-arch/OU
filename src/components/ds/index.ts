// ── Ou* (현행 단일 계통) ───────────────────────────────────
export { OuLogo }        from './OuLogo';

export { OuButton }      from './OuButton';
export type { OuButtonProps, OuButtonVariant, OuButtonSize } from './OuButton';

export { OuCard }        from './OuCard';
export type { OuCardProps, OuCardVariant, OuCardSize } from './OuCard';

export { OuInput }       from './OuInput';
export type { OuInputProps } from './OuInput';

export { OuModal }       from './OuModal';
export type { OuModalProps } from './OuModal';

export { OuAvatar }      from './OuAvatar';
export type { OuAvatarProps } from './OuAvatar';

export { OuDivider }     from './OuDivider';
export type { OuDividerProps } from './OuDivider';

export { OuTabs }        from './OuTabs';
export type { OuTabsProps, OuTab } from './OuTabs';

export { ToastProvider, useToast } from './OuToast';

// ── Neu* 전용 컴포넌트 (Ou* 별칭 포함) ──────────────────────
export { NeuBadge }            from './NeuBadge';
export { NeuBadge as OuBadge } from './NeuBadge';

export { NeuCheckbox }              from './NeuCheckbox';
export { NeuCheckbox as OuCheckbox } from './NeuCheckbox';

export { NeuCircleDisplay }                from './NeuCircleDisplay';
export { NeuCircleDisplay as OuCircleDisplay } from './NeuCircleDisplay';

export { NeuNavItem }             from './NeuNavItem';
export { NeuNavItem as OuNavItem } from './NeuNavItem';

export { NeuNotificationBadge }                    from './NeuNotificationBadge';
export { NeuNotificationBadge as OuNotificationBadge } from './NeuNotificationBadge';

export { NeuProgress }              from './NeuProgress';
export { NeuProgress as OuProgress } from './NeuProgress';

export { NeuSearchBar }               from './NeuSearchBar';
export { NeuSearchBar as OuSearchBar } from './NeuSearchBar';

export { NeuSectionTitle }                from './NeuSectionTitle';
export { NeuSectionTitle as OuSectionTitle } from './NeuSectionTitle';

export { NeuSelect }             from './NeuSelect';
export { NeuSelect as OuSelect } from './NeuSelect';

export { NeuSlider }             from './NeuSlider';
export { NeuSlider as OuSlider } from './NeuSlider';

export { NeuTable }            from './NeuTable';
export { NeuTable as OuTable } from './NeuTable';
export type { NeuTableColumn }                  from './NeuTable';
export type { NeuTableColumn as OuTableColumn } from './NeuTable';

export { NeuTag }           from './NeuTag';
export { NeuTag as OuTag }  from './NeuTag';

export { NeuTextarea }              from './NeuTextarea';
export { NeuTextarea as OuTextarea } from './NeuTextarea';

export { NeuToggle }             from './NeuToggle';
export { NeuToggle as OuToggle } from './NeuToggle';

export { NeuPageLayout }                from './NeuPageLayout';
export { NeuPageLayout as OuPageLayout } from './NeuPageLayout';

export { NeuAuthLayout }                from './NeuAuthLayout';
export { NeuAuthLayout as OuAuthLayout } from './NeuAuthLayout';

// ── Orb (도메인 특화 입력 위젯) ──────────────────────────────
export { OrbChat }    from './OrbChat';
export { OrbComment } from './OrbComment';
export { OrbPost }    from './OrbPost';
export { OrbQuick }   from './OrbQuick';
export { OrbSearch }  from './OrbSearch';

// ── 공용 레이아웃 ─────────────────────────────────────────
export { AmbientBackground } from './AmbientBackground';
export { PageLayout }        from './PageLayout';
export { AuthLayout }        from './AuthLayout';
export { GlassSkeleton }     from './GlassSkeleton';

// ── 호환 alias (기존 Glass*/Neu* import → Ou*) ──────────────
export { OuButton  as GlassButton }  from './OuButton';
export { OuButton  as NeuButton }    from './OuButton';
export { OuCard    as GlassCard }    from './OuCard';
export { OuCard    as NeuCard }      from './OuCard';
export { OuInput   as GlassInput }   from './OuInput';
export { OuInput   as NeuInput }     from './OuInput';
export { OuModal   as GlassModal }   from './OuModal';
export { OuModal   as NeuModal }     from './OuModal';
export { OuAvatar  as GlassAvatar }  from './OuAvatar';
export { OuAvatar  as NeuAvatar }    from './OuAvatar';
export { OuDivider as GlassDivider } from './OuDivider';
export { OuDivider as NeuDivider }   from './OuDivider';
export { OuTabs    as GlassTabs }    from './OuTabs';
export { OuTabs    as NeuTabs }      from './OuTabs';
