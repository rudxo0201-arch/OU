'use client';

interface Props {
  width: number;
  height: number;
  gridSize: number;
}

export function GridOverlay({ width, height, gridSize }: Props) {
  const cols = Math.ceil(width / gridSize);
  const rows = Math.ceil(height / gridSize);

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      width={width}
      height={height}
    >
      {Array.from({ length: cols + 1 }, (_, i) => (
        Array.from({ length: rows + 1 }, (_, j) => (
          <circle
            key={`${i}-${j}`}
            cx={i * gridSize}
            cy={j * gridSize}
            r={1}
            fill="var(--ou-border-subtle)"
          />
        ))
      ))}
    </svg>
  );
}
