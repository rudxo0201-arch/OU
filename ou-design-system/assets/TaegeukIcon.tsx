interface TaegeukIconProps {
  size?: number;
  className?: string;
  opacity?: number;
}

export function TaegeukIcon({ size = 20, className, opacity = 0.6 }: TaegeukIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ opacity }}
    >
      {/* 외곽 원 */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* 음 (어두운 반) */}
      <path
        d="M50 2 A48 48 0 0 1 50 98 A24 24 0 0 1 50 50 A24 24 0 0 0 50 2"
        fill="currentColor"
      />
      {/* 양 점 */}
      <circle cx="50" cy="26" r="7" fill="currentColor" opacity="0" />
      {/* 음 점 */}
      <circle cx="50" cy="74" r="7" fill="var(--mantine-color-body, #fff)" />
      {/* 양 영역 내 점 */}
      <circle cx="50" cy="26" r="7" fill="var(--mantine-color-body, #fff)" />
      {/* 음 영역 내 점 */}
      <circle cx="50" cy="74" r="7" fill="currentColor" />
    </svg>
  );
}
