'use client';

import type { DocumentTemplate } from '@/types/document-template';

interface PageHeaderProps {
  template: DocumentTemplate;
  documentTitle: string;
  sectionTitle?: string;
  pageNumber: number;
}

export function PageHeader({ template, documentTitle, sectionTitle, pageNumber }: PageHeaderProps) {
  const { headerFooter } = template.layout;
  const style = template.typography.scale.headerFooter;
  const font = template.typography.fontFamily.caption;

  if (headerFooter.headerContent === 'none') return null;

  const content = headerFooter.headerContent === 'section'
    ? (sectionTitle ?? documentTitle)
    : documentTitle;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        height: '100%',
        paddingBottom: 6,
        ...(headerFooter.headerDivider
          ? { borderBottom: `0.5px solid #ddd` }
          : {}),
      }}
    >
      <span
        style={{
          fontFamily: font,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          color: style.color,
          letterSpacing: `${style.letterSpacing}em`,
          textTransform: template.id === 'magazine' ? 'uppercase' as const : undefined,
          flex: 1,
        }}
      >
        {content}
      </span>
    </div>
  );
}
