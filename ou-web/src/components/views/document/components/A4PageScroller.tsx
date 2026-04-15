'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Box, ScrollArea } from '@mantine/core';
import { A4_WIDTH_PX, A4_HEIGHT_PX } from '@/types/document-template';

interface A4PageScrollerProps {
  children: React.ReactNode;
}

/**
 * A4 페이지 목록 스크롤 컨테이너
 * - 부모 너비에 맞춰 scale transform 적용
 * - 페이지 간 그림자 + 간격으로 시각적 분리
 */
export function A4PageScroller({ children }: A4PageScrollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.offsetWidth;
    const padding = 40; // 좌우 여백
    const available = containerWidth - padding;
    const newScale = Math.min(1, available / A4_WIDTH_PX);
    setScale(newScale);
  }, []);

  useEffect(() => {
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateScale]);

  return (
    <Box ref={containerRef} style={{ width: '100%' }}>
      <ScrollArea h="calc(100vh - 200px)" type="auto">
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            padding: '24px 0',
          }}
        >
          <Box
            style={{
              transformOrigin: 'top center',
              transform: `scale(${scale})`,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {children}
          </Box>
        </Box>
      </ScrollArea>

      {/* 페이지 그림자 스타일 */}
      <style>{`
        .a4-page {
          box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04);
        }
        @media print {
          .a4-page { box-shadow: none; }
        }
      `}</style>
    </Box>
  );
}
