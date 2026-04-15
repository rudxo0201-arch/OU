import { useMemo } from 'react';
import type { DocumentTemplate, PageContent, PageSection, PageSentence } from '@/types/document-template';
import { A4_WIDTH_PX, A4_HEIGHT_PX, MM_TO_PX } from '@/types/document-template';

interface Section {
  id: string;
  heading: string | null;
  order_idx: number;
  sentences: { id: string; text: string; order_idx: number }[];
}

/**
 * 추정 기반 페이지 분할
 *
 * sections/sentences를 받아서 템플릿 설정에 따라
 * 페이지 단위로 분할한 결과를 반환.
 *
 * 접근: 텍스트 길이 + lineHeight + fontSize로 높이를 추정.
 * 정확도는 ~90% 수준이지만, DOM 측정 없이 즉시 계산 가능.
 */
export function usePageBreaker(
  sections: Section[],
  template: DocumentTemplate,
): PageContent[] {
  return useMemo(() => {
    if (!sections.length) return [];

    const { page, typography, layout } = template;
    const mt = page.margin.top * MM_TO_PX;
    const mr = page.margin.right * MM_TO_PX;
    const mb = page.margin.bottom * MM_TO_PX;
    const ml = page.margin.left * MM_TO_PX;

    const headerH = layout.headerFooter.showHeader ? 28 : 0;
    const footerH = layout.headerFooter.showFooter ? 28 : 0;
    const pageContentHeight = A4_HEIGHT_PX - mt - mb - headerH - footerH;

    const contentWidth = A4_WIDTH_PX - ml - mr;
    const colWidth = page.columnCount === 2
      ? (contentWidth - page.columnGap * MM_TO_PX) / 2
      : contentWidth;

    // 사용 가능한 총 높이 (2단이면 2배)
    const availableHeight = page.columnCount === 2
      ? pageContentHeight * 2
      : pageContentHeight;

    const bodyStyle = typography.scale.body;
    const headingStyle = typography.scale.sectionHeading;

    // 한 줄 높이 (px)
    const bodyLineHeight = bodyStyle.fontSize * bodyStyle.lineHeight;
    // 한 줄에 들어가는 글자 수 추정 (한글 기준, 폰트 크기의 ~0.9배가 글자 폭)
    const charsPerLine = Math.floor(colWidth / (bodyStyle.fontSize * 0.55));

    function estimateTextHeight(text: string, fontSize: number, lineHeight: number): number {
      const charWidth = fontSize * 0.55;
      const cpl = Math.floor(colWidth / charWidth);
      if (cpl <= 0) return lineHeight;
      const lines = Math.ceil(text.length / cpl);
      return Math.max(1, lines) * (fontSize * lineHeight);
    }

    function estimateHeadingHeight(heading: string): number {
      const h = estimateTextHeight(heading, headingStyle.fontSize, headingStyle.lineHeight);
      return headingStyle.marginTop + h + headingStyle.marginBottom;
    }

    // 페이지 분할
    const pages: PageContent[] = [];
    let currentPageSections: PageSection[] = [];
    let currentHeight = 0;
    let pageNumber = 1;

    function finishPage() {
      if (currentPageSections.length > 0) {
        pages.push({ pageNumber, sections: currentPageSections });
        pageNumber++;
        currentPageSections = [];
        currentHeight = 0;
      }
    }

    for (const section of sections) {
      // 섹션 브레이크
      if (layout.sectionBreak === 'newPage' && currentPageSections.length > 0) {
        finishPage();
      }

      // 제목 높이
      let headingH = 0;
      if (section.heading) {
        headingH = estimateHeadingHeight(section.heading);
      }

      // 제목이 현재 페이지에 안 들어가면 새 페이지
      if (currentHeight + headingH > availableHeight && currentPageSections.length > 0) {
        finishPage();
      }

      currentHeight += headingH;

      const currentSection: PageSection = {
        id: section.id,
        heading: section.heading,
        isHeadingOnThisPage: true,
        sentences: [],
      };

      for (const sentence of section.sentences) {
        const sentenceH = estimateTextHeight(sentence.text, bodyStyle.fontSize, bodyStyle.lineHeight)
          + typography.paragraphSpacing;

        if (currentHeight + sentenceH > availableHeight) {
          // 현재 섹션을 페이지에 추가 (문장들과 함께)
          if (currentSection.sentences.length > 0) {
            currentPageSections.push({ ...currentSection });
          }
          finishPage();

          // 새 페이지에서 이어지는 섹션
          currentSection.sentences = [];
          currentSection.isHeadingOnThisPage = false;
        }

        currentSection.sentences.push({
          id: sentence.id,
          text: sentence.text,
          orderIdx: sentence.order_idx,
        });
        currentHeight += sentenceH;
      }

      // 남은 문장이 있으면 현재 페이지에 추가
      if (currentSection.sentences.length > 0) {
        currentPageSections.push(currentSection);
      }
    }

    // 마지막 페이지
    finishPage();

    return pages;
  }, [sections, template]);
}
