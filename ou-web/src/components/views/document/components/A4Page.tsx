'use client';

import type { DocumentTemplate } from '@/types/document-template';
import { A4_WIDTH_PX, A4_HEIGHT_PX, MM_TO_PX } from '@/types/document-template';
import { PageHeader } from './PageHeader';
import { PageFooter } from './PageFooter';

interface A4PageProps {
  template: DocumentTemplate;
  pageNumber: number;
  totalPages: number;
  documentTitle: string;
  sectionTitle?: string;
  children: React.ReactNode;
}

export function A4Page({
  template,
  pageNumber,
  totalPages,
  documentTitle,
  sectionTitle,
  children,
}: A4PageProps) {
  const { page, decoration } = template;
  const mt = page.margin.top * MM_TO_PX;
  const mr = page.margin.right * MM_TO_PX;
  const mb = page.margin.bottom * MM_TO_PX;
  const ml = page.margin.left * MM_TO_PX;

  const headerHeight = template.layout.headerFooter.showHeader ? 28 : 0;
  const footerHeight = template.layout.headerFooter.showFooter ? 28 : 0;

  const contentHeight = A4_HEIGHT_PX - mt - mb - headerHeight - footerHeight;

  return (
    <div
      className="a4-page"
      style={{
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        position: 'relative',
        background: '#fff',
        overflow: 'hidden',
        boxSizing: 'border-box',
        // 페이지 테두리
        ...(decoration.pageBorder.enabled && decoration.pageBorder.style !== 'none'
          ? {
              border: `${decoration.pageBorder.width}px ${decoration.pageBorder.style} ${decoration.pageBorder.color}`,
              padding: decoration.pageBorder.inset * MM_TO_PX,
            }
          : {}),
      }}
    >
      {/* 헤더 */}
      {template.layout.headerFooter.showHeader && (
        <div
          style={{
            position: 'absolute',
            top: mt - 4,
            left: ml,
            right: mr,
            height: headerHeight,
          }}
        >
          <PageHeader
            template={template}
            documentTitle={documentTitle}
            sectionTitle={sectionTitle}
            pageNumber={pageNumber}
          />
        </div>
      )}

      {/* 콘텐츠 영역 */}
      <div
        style={{
          position: 'absolute',
          top: mt + headerHeight,
          left: ml,
          right: mr,
          height: contentHeight,
          overflow: 'hidden',
          // 다단 레이아웃
          ...(page.columnCount === 2
            ? {
                columnCount: 2,
                columnGap: page.columnGap * MM_TO_PX,
                columnRule: 'none',
              }
            : {}),
        }}
      >
        {children}
      </div>

      {/* 푸터 */}
      {template.layout.headerFooter.showFooter && (
        <div
          style={{
            position: 'absolute',
            bottom: mb - 4,
            left: ml,
            right: mr,
            height: footerHeight,
          }}
        >
          <PageFooter
            template={template}
            documentTitle={documentTitle}
            pageNumber={pageNumber}
            totalPages={totalPages}
          />
        </div>
      )}
    </div>
  );
}
