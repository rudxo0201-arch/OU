'use client';

import { Box } from '@mantine/core';
import { Star } from '@phosphor-icons/react';

export type OULoaderVariant = 'star' | 'ripple';
export type OULoaderSize = 'xs' | 'sm' | 'md' | 'lg';

interface OULoaderProps {
  variant?: OULoaderVariant;
  size?: OULoaderSize;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP: Record<OULoaderSize, number> = { xs: 16, sm: 24, md: 40, lg: 64 };
const RING_SCALE = [1, 1.5, 2];

export function OULoader({ variant = 'star', size = 'sm', className, style }: OULoaderProps) {
  const px = SIZE_MAP[size];

  if (variant === 'star') {
    return (
      <Box
        component="span"
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: px,
          height: px,
          flexShrink: 0,
          ...style,
        }}
      >
        <Star
          size={px}
          weight="fill"
          style={{
            color: 'var(--mantine-color-yellow-5)',
            animation: 'ou-star-breathe 1.5s ease-in-out infinite',
            display: 'block',
          }}
        />
      </Box>
    );
  }

  // ripple variant
  return (
    <Box
      component="span"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: px * RING_SCALE[RING_SCALE.length - 1],
        height: px * RING_SCALE[RING_SCALE.length - 1],
        flexShrink: 0,
        ...style,
      }}
    >
      {RING_SCALE.map((scale, i) => (
        <Box
          key={i}
          component="span"
          style={{
            position: 'absolute',
            inset: 0,
            margin: 'auto',
            width: px * scale,
            height: px * scale,
            borderRadius: '50%',
            border: '1.5px solid rgba(255, 255, 255, 0.55)',
            animation: `ou-ripple 1.8s ease-out ${i * 0.6}s infinite`,
          }}
        />
      ))}
    </Box>
  );
}
