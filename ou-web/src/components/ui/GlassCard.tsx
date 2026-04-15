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
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '0.5px solid var(--mantine-color-default-border)',
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
