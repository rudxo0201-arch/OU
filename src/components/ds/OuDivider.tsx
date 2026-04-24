import { CSSProperties } from 'react';

export interface OuDividerProps {
  vertical?: boolean;
  style?: CSSProperties;
}

export function OuDivider({ vertical = false, style }: OuDividerProps) {
  return (
    <div
      style={{
        background: 'var(--ou-border-subtle)',
        ...(vertical
          ? { width: 1, alignSelf: 'stretch' }
          : { height: 1, width: '100%' }),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
