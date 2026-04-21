import { CSSProperties } from 'react';

interface GlassDividerProps {
  vertical?: boolean;
  style?: CSSProperties;
}

export function GlassDivider({ vertical = false, style }: GlassDividerProps) {
  return (
    <div
      style={{
        background: 'var(--ou-glass-border)',
        ...(vertical
          ? { width: 1, alignSelf: 'stretch' }
          : { height: 1, width: '100%' }),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
