'use client';

export type EmptyStateSkeleton = 'finance' | 'schedule' | 'task' | 'habit' | 'idea' | 'list' | 'streak';

interface WidgetEmptyStateProps {
  skeleton: EmptyStateSkeleton;
  cta?: string;
}

const BLOCK = ({ w, h, style }: { w: number | string; h: number; style?: React.CSSProperties }) => (
  <div style={{
    width: w, height: h,
    background: 'var(--ou-border-faint)',
    borderRadius: 4,
    flexShrink: 0,
    ...style,
  }} />
);

const ROW = ({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap }} children={children} />
);

function FinanceSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <BLOCK w={80} h={28} />
      <div style={{ height: 1, background: 'var(--ou-border-faint)' }} />
      {[48, 36, 36].map((w, i) => (
        <ROW key={i}>
          <BLOCK w={20} h={20} style={{ borderRadius: '50%' }} />
          <BLOCK w={w} h={11} />
          <div style={{ flex: 1 }} />
          <BLOCK w={32} h={11} />
        </ROW>
      ))}
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      {[['08:00', 72], ['11:30', 88], ['15:00', 56]].map(([time, w], i) => (
        <ROW key={i} gap={10}>
          <BLOCK w={28} h={10} />
          <BLOCK w={w as number} h={24} style={{ borderRadius: 6 }} />
        </ROW>
      ))}
    </div>
  );
}

function TaskSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
      {[68, 88, 52, 76].map((w, i) => (
        <ROW key={i}>
          <BLOCK w={14} h={14} style={{ borderRadius: 3 }} />
          <BLOCK w={w} h={11} />
        </ROW>
      ))}
    </div>
  );
}

function HabitSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      {[0, 1, 2].map(row => (
        <ROW key={row} gap={6}>
          <BLOCK w={52} h={11} />
          <div style={{ flex: 1, display: 'flex', gap: 4 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <BLOCK key={i} w={14} h={14} style={{ borderRadius: 3 }} />
            ))}
          </div>
        </ROW>
      ))}
    </div>
  );
}

function IdeaSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      {[['100%', 36], ['85%', 28], ['60%', 20]].map(([w, h], i) => (
        <BLOCK key={i} w={w as string} h={h as number} style={{ borderRadius: 6 }} />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
      {[80, 60, 72, 48].map((w, i) => (
        <ROW key={i} gap={8}>
          <BLOCK w={6} h={6} style={{ borderRadius: '50%' }} />
          <BLOCK w={w} h={11} />
        </ROW>
      ))}
    </div>
  );
}

function StreakSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, alignItems: 'flex-start' }}>
      <BLOCK w={48} h={40} />
      <BLOCK w={36} h={10} />
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <BLOCK key={i} w={20} h={20} style={{ borderRadius: 4 }} />
        ))}
      </div>
    </div>
  );
}

const SKELETONS: Record<EmptyStateSkeleton, React.FC> = {
  finance: FinanceSkeleton,
  schedule: ScheduleSkeleton,
  task: TaskSkeleton,
  habit: HabitSkeleton,
  idea: IdeaSkeleton,
  list: ListSkeleton,
  streak: StreakSkeleton,
};

export function WidgetEmptyState({ skeleton, cta = 'Q에서 기록하세요' }: WidgetEmptyStateProps) {
  const SkeletonComponent = SKELETONS[skeleton];

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '12px 14px 10px',
      gap: 10,
    }}>
      <div style={{ flex: 1, opacity: 0.45, display: 'flex', flexDirection: 'column' }}>
        <SkeletonComponent />
      </div>
      <div style={{
        fontSize: 11,
        color: 'var(--ou-text-disabled)',
        letterSpacing: '0.01em',
        flexShrink: 0,
      }}>
        {cta}
      </div>
    </div>
  );
}
