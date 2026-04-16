'use client';

import { forwardRef } from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  [key: string]: any;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ children, style, className, onClick, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={className}
        onClick={onClick}
        style={{
          background: 'var(--ou-glass-bg)',
          backdropFilter: 'blur(var(--ou-glass-blur))',
          WebkitBackdropFilter: 'blur(var(--ou-glass-blur))',
          border: '0.5px solid var(--ou-glass-border)',
          borderRadius: 8,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
