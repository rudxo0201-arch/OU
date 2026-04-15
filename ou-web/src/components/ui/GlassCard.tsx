'use client';

import { Box, type BoxProps } from '@mantine/core';
import { forwardRef } from 'react';

interface GlassCardProps extends BoxProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ children, style, ...props }, ref) {
    return (
      <Box
        ref={ref}
        style={{
          background: 'var(--ou-glass-bg)',
          backdropFilter: 'blur(var(--ou-glass-blur))',
          WebkitBackdropFilter: 'blur(var(--ou-glass-blur))',
          border: '0.5px solid var(--ou-glass-border)',
          borderRadius: 'var(--mantine-radius-md)',
          ...style,
        }}
        {...props}
      >
        {children}
      </Box>
    );
  }
);
