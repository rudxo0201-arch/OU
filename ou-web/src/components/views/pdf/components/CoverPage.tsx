'use client';

import { Box, Text } from '@mantine/core';
import type { DocumentTemplate } from '@/types/document-template';
import { A4_WIDTH_PX, A4_HEIGHT_PX, MM_TO_PX } from '@/types/document-template';

interface CoverPageProps {
  template: DocumentTemplate;
  title: string;
  subtitle?: string;
  date?: string;
  author?: string;
}

export function CoverPage({ template, title, subtitle, date, author }: CoverPageProps) {
  const { components, typography, page } = template;
  const cover = components.cover;
  const font = typography.fontFamily;
  const ml = page.margin.left * MM_TO_PX;
  const mr = page.margin.right * MM_TO_PX;

  const positionStyles: Record<string, React.CSSProperties> = {
    center: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      height: '100%',
      padding: `0 ${ml}px`,
    },
    'bottom-left': {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: `${page.margin.top * MM_TO_PX}px ${mr}px ${page.margin.bottom * MM_TO_PX * 2}px ${ml}px`,
      height: '100%',
    },
    'top-left': {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      padding: `${page.margin.top * MM_TO_PX * 3}px ${mr}px 0 ${ml}px`,
      height: '100%',
    },
  };

  return (
    <Box
      className="a4-page a4-cover"
      style={{
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        position: 'relative',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* 테두리 프레임 */}
      {cover.borderFrame && (
        <Box
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: '0.5px solid #ccc',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 세로 장식선 (매거진) */}
      {cover.verticalRule && (
        <Box
          style={{
            position: 'absolute',
            left: ml - 8,
            top: page.margin.top * MM_TO_PX,
            bottom: page.margin.bottom * MM_TO_PX,
            width: 2,
            background: '#222',
          }}
        />
      )}

      <Box style={positionStyles[cover.titlePosition]}>
        {/* 제목 */}
        <Text
          style={{
            fontFamily: font.heading,
            fontSize: cover.titleFontSize,
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#111',
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}
        >
          {title}
        </Text>

        {/* 구분선 */}
        {cover.titlePosition === 'center' && (
          <Box
            style={{
              width: 48,
              height: 2,
              background: '#333',
              marginBottom: 20,
            }}
          />
        )}

        {/* 부제목 */}
        {subtitle && (
          <Text
            style={{
              fontFamily: font.body,
              fontSize: cover.subtitleFontSize,
              fontWeight: 400,
              lineHeight: 1.6,
              color: '#555',
              marginBottom: 24,
            }}
          >
            {subtitle}
          </Text>
        )}

        {/* 저자 */}
        {cover.showAuthor && author && (
          <Text
            style={{
              fontFamily: font.caption,
              fontSize: 11,
              fontWeight: 400,
              color: '#888',
              marginBottom: 8,
            }}
          >
            {author}
          </Text>
        )}

        {/* 날짜 */}
        {cover.showDate && date && (
          <Text
            style={{
              fontFamily: font.caption,
              fontSize: 10,
              fontWeight: 400,
              color: '#aaa',
              letterSpacing: '0.05em',
            }}
          >
            {date}
          </Text>
        )}
      </Box>
    </Box>
  );
}
