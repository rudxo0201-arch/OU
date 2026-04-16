'use client';

import Image from 'next/image';

interface OULogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function OULogo({ size = 40, className, style }: OULogoProps) {
  return (
    <Image
      src="/ou-logo.png"
      alt="OU"
      width={size}
      height={Math.round(size * 0.55)}
      className={className}
      style={{ objectFit: 'contain', ...style }}
      priority
    />
  );
}
