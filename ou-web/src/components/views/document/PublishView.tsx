'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PageContent } from '@/types/document-template';
import { getTemplate, DEFAULT_TEMPLATE_ID } from './templates';
import { loadNotoSerifKR } from './templates/fonts';
import { A4Page } from './components/A4Page';
import { A4PageScroller } from './components/A4PageScroller';
import { CoverPage } from './components/CoverPage';
import { TocPage } from './components/TocPage';
import { SectionRenderer } from './components/SectionRenderer';
import { TemplatePicker } from './components/TemplatePicker';
import { usePageBreaker } from './components/usePageBreaker';

interface Section {
  id: string;
  heading: string | null;
  order_idx: number;
  sentences: { id: string; text: string; order_idx: number }[];
}

interface PublishViewProps {
  nodeId: string;
  title: string;
  subtitle?: string;
}

export function PublishView({ nodeId, title, subtitle }: PublishViewProps) {
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  const template = getTemplate(templateId);

  // Noto Serif KR 로딩
  useEffect(() => {
    loadNotoSerifKR();
  }, []);

  // sections/sentences 로드
  useEffect(() => {
    if (!nodeId) return;
    setLoading(true);

    fetch(`/api/nodes/${nodeId}/content`)
      .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(data => {
        setSections(data.sections ?? []);
      })
      .catch(() => {
        setSections([]);
      })
      .finally(() => setLoading(false));
  }, [nodeId]);

  // 페이지 분할
  const pages = usePageBreaker(sections, template);

  // 현재 날짜
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  // 전체 섹션 인덱스 추적
  const getSectionGlobalIndex = useCallback((sectionId: string) => {
    return sections.findIndex(s => s.id === sectionId);
  }, [sections]);

  // 현재 페이지의 첫 섹션 제목 (헤더용)
  const getPageSectionTitle = useCallback((page: PageContent) => {
    const firstWithHeading = page.sections.find(s => s.isHeadingOnThisPage && s.heading);
    return firstWithHeading?.heading ?? undefined;
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
        <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)' }}>불러오는 중...</span>
        <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>문서를 준비하는 중...</span>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
        <span style={{ fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-dimmed)' }}>구조화된 콘텐츠가 없습니다</span>
        <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>텍스트 탭에서 먼저 문서를 확인해주세요</span>
      </div>
    );
  }

  return (
    <div>
      {/* 템플릿 선택 */}
      <TemplatePicker selectedId={templateId} onSelect={setTemplateId} />

      {/* A4 페이지 렌더링 */}
      <A4PageScroller>
        {/* 표지 */}
        {template.layout.coverPage && (
          <CoverPage
            template={template}
            title={title}
            subtitle={subtitle}
            date={dateStr}
          />
        )}

        {/* 목차 */}
        {template.layout.tocPage && (
          <TocPage
            template={template}
            pages={pages}
            sections={sections}
          />
        )}

        {/* 본문 페이지 */}
        {pages.map((page) => (
          <A4Page
            key={page.pageNumber}
            template={template}
            pageNumber={page.pageNumber}
            totalPages={pages.length}
            documentTitle={title}
            sectionTitle={getPageSectionTitle(page)}
          >
            <SectionRenderer
              sections={page.sections}
              template={template}
              isFirstPage={page.pageNumber === 1}
              sectionIndex={
                page.sections[0]
                  ? getSectionGlobalIndex(page.sections[0].id)
                  : 0
              }
            />
          </A4Page>
        ))}
      </A4PageScroller>
    </div>
  );
}
