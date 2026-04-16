'use client';

import type { DocumentTemplate, PageContent } from '@/types/document-template';
import { A4_WIDTH_PX, A4_HEIGHT_PX, MM_TO_PX } from '@/types/document-template';

interface TocPageProps {
  template: DocumentTemplate;
  pages: PageContent[];
  sections: { id: string; heading: string | null }[];
}

export function TocPage({ template, pages, sections }: TocPageProps) {
  const { typography, page } = template;
  const font = typography.fontFamily;
  const ml = page.margin.left * MM_TO_PX;
  const mr = page.margin.right * MM_TO_PX;
  const mt = page.margin.top * MM_TO_PX;

  // 섹션별 시작 페이지 번호 계산
  const sectionPageMap = new Map<string, number>();
  for (const p of pages) {
    for (const s of p.sections) {
      if (s.isHeadingOnThisPage && !sectionPageMap.has(s.id)) {
        // +1 for cover, +1 for toc itself (if exists)
        const offset = (template.layout.coverPage ? 1 : 0) + 1;
        sectionPageMap.set(s.id, p.pageNumber + offset);
      }
    }
  }

  const headingSections = sections.filter(s => s.heading);

  return (
    <div
      className="a4-page a4-toc"
      style={{
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        position: 'relative',
        background: '#fff',
        overflow: 'hidden',
        padding: `${mt * 1.5}px ${mr}px 0 ${ml}px`,
      }}
    >
      {/* 목차 제목 */}
      <span
        style={{
          fontFamily: font.heading,
          fontSize: 18,
          fontWeight: 600,
          color: '#111',
          marginBottom: 32,
          letterSpacing: '0.05em',
          display: 'block',
        }}
      >
        목차
      </span>

      {/* 항목 */}
      {headingSections.map((section, idx) => {
        const pageNum = sectionPageMap.get(section.id);
        return (
          <div
            key={section.id}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              marginBottom: 12,
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: font.body,
                fontSize: 12,
                fontWeight: 400,
                color: '#333',
                whiteSpace: 'nowrap',
              }}
            >
              {section.heading}
            </span>
            <div
              style={{
                flex: 1,
                borderBottom: '0.5px dotted #ccc',
                marginBottom: 3,
                minWidth: 40,
              }}
            />
            {pageNum && (
              <span
                style={{
                  fontFamily: font.caption,
                  fontSize: 11,
                  fontWeight: 400,
                  color: '#888',
                  whiteSpace: 'nowrap',
                }}
              >
                {pageNum}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
