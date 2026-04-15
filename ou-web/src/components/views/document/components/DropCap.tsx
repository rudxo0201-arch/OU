'use client';

import { Box } from '@mantine/core';

interface DropCapProps {
  char: string;
  fontFamily: string;
  bodyFontSize: number;
  bodyLineHeight: number;
  color?: string;
}

/**
 * 드롭캡 — 섹션 첫 글자를 3줄 높이로 확대
 */
export function DropCap({ char, fontFamily, bodyFontSize, bodyLineHeight, color = '#111' }: DropCapProps) {
  const lineH = bodyFontSize * bodyLineHeight;
  const dropLines = 3;
  const dropSize = lineH * dropLines;

  return (
    <Box
      component="span"
      style={{
        float: 'left',
        fontFamily,
        fontSize: dropSize * 0.85,
        lineHeight: 1,
        fontWeight: 700,
        color,
        paddingRight: 6,
        paddingTop: 4,
        // 시각적 정렬 보정
        marginTop: -2,
        marginBottom: -4,
      }}
    >
      {char}
    </Box>
  );
}
