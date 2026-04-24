import { CSSProperties } from 'react';

interface OuLogoProps {
  width?: number;
  color?: string;
  style?: CSSProperties;
}

export function OuLogo({ width = 48, color = 'currentColor', style }: OuLogoProps) {
  const height = Math.round(width * (92 / 193));
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 193 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      aria-label="OU"
    >
      <circle cx="146.5" cy="39.66" r="11.5" fill={color} />
      <path
        d="M92 7.79883V84.2012L84.2012 92H7.79883L0 84.2012V7.79883L7.79883 0H84.2012L92 7.79883ZM18 14C15.7909 14 14 15.7909 14 18V74C14 76.2091 15.7909 78 18 78H74C76.2091 78 78 76.2091 78 74V18C78 15.7909 76.2091 14 74 14H18Z"
        fill={color}
      />
      <path
        d="M115 74C115 76.2091 116.791 78 119 78H175C177.209 78 179 76.2091 179 74V0H193V84.2012L185.201 92H108.799L101 84.2012V0H115V74Z"
        fill={color}
      />
    </svg>
  );
}
