'use client';

import type { DocumentTemplate } from '@/types/document-template';

interface PageFooterProps {
  template: DocumentTemplate;
  documentTitle: string;
  pageNumber: number;
  totalPages: number;
}

export function PageFooter({ template, documentTitle, pageNumber, totalPages }: PageFooterProps) {
  const { headerFooter } = template.layout;
  const style = template.typography.scale.pageNumber;
  const font = template.typography.fontFamily.caption;

  if (headerFooter.footerContent === 'none') return null;

  const pageNumStr = `${pageNumber}`;

  const positionStyle: React.CSSProperties = (() => {
    switch (headerFooter.pageNumberPosition) {
      case 'center':
        return { justifyContent: 'center' };
      case 'right':
        return { justifyContent: 'flex-end' };
      case 'outside':
        // 홀수 = 오른쪽, 짝수 = 왼쪽
        return { justifyContent: pageNumber % 2 === 1 ? 'flex-end' : 'flex-start' };
      default:
        return { justifyContent: 'center' };
    }
  })();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        height: '100%',
        paddingTop: 6,
        ...positionStyle,
        ...(headerFooter.footerDivider
          ? { borderTop: `0.5px solid #ddd` }
          : {}),
      }}
    >
      {headerFooter.footerContent === 'title-pageNumber' ? (
        <span
          style={{
            fontFamily: font,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            color: style.color,
            letterSpacing: `${style.letterSpacing}em`,
          }}
        >
          {documentTitle} — {pageNumStr}
        </span>
      ) : (
        <span
          style={{
            fontFamily: font,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            color: style.color,
            letterSpacing: `${style.letterSpacing}em`,
          }}
        >
          {pageNumStr}
        </span>
      )}
    </div>
  );
}
