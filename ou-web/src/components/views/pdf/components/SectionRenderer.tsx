'use client';

import { Box, Text } from '@mantine/core';
import type { DocumentTemplate, PageSection } from '@/types/document-template';
import { DropCap } from './DropCap';
import { SectionDivider } from './SectionDivider';

interface SectionRendererProps {
  sections: PageSection[];
  template: DocumentTemplate;
  isFirstPage: boolean;
  sectionIndex: number; // 전체 문서 내 섹션 인덱스 (교재 번호 매기기용)
}

export function SectionRenderer({
  sections,
  template,
  isFirstPage,
  sectionIndex,
}: SectionRendererProps) {
  const { typography, layout, decoration } = template;
  const { scale, fontFamily, paragraphSpacing, firstLineIndent, textAlign } = typography;
  const headingStyle = scale.sectionHeading;
  const bodyStyle = scale.body;

  return (
    <>
      {sections.map((section, sIdx) => {
        const isFirst = isFirstPage && sIdx === 0;
        const showDivider = !isFirst && section.isHeadingOnThisPage && sIdx > 0;
        const useDropCap = layout.dropCap && section.isHeadingOnThisPage && section.sentences.length > 0;

        // 교재: 섹션 제목에 회색 밴드
        const isTextbook = template.id === 'textbook';
        // 보고서: 섹션 제목에 세로 바
        const isReport = template.id === 'report';

        return (
          <Box key={`${section.id}-${sIdx}`}>
            {/* 섹션 구분선 */}
            {showDivider && <SectionDivider decoration={decoration} />}

            {/* 섹션 제목 */}
            {section.isHeadingOnThisPage && section.heading && (
              <Box
                style={{
                  marginTop: isFirst ? 0 : headingStyle.marginTop,
                  marginBottom: headingStyle.marginBottom,
                  // 교재: 회색 밴드
                  ...(isTextbook
                    ? {
                        background: '#f0f0f0',
                        padding: '8px 12px',
                        borderRadius: 2,
                      }
                    : {}),
                  // 보고서: 세로 바
                  ...(isReport
                    ? {
                        borderLeft: '4px solid #333',
                        paddingLeft: 12,
                      }
                    : {}),
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.heading,
                    fontSize: headingStyle.fontSize,
                    fontWeight: headingStyle.fontWeight,
                    lineHeight: headingStyle.lineHeight,
                    letterSpacing: `${headingStyle.letterSpacing}em`,
                    color: headingStyle.color,
                  }}
                >
                  {section.heading}
                </Text>
              </Box>
            )}

            {/* 문장들 */}
            <Box
              style={{
                fontFamily: fontFamily.body,
                fontSize: bodyStyle.fontSize,
                fontWeight: bodyStyle.fontWeight,
                lineHeight: bodyStyle.lineHeight,
                letterSpacing: `${bodyStyle.letterSpacing}em`,
                color: bodyStyle.color,
                textAlign,
              }}
            >
              {section.sentences.map((sentence, sentIdx) => {
                const isFirstSentence = sentIdx === 0;
                const showDropCap = useDropCap && isFirstSentence;
                const text = sentence.text;

                if (showDropCap && text.length > 1) {
                  const firstChar = text[0];
                  const rest = text.slice(1);

                  return (
                    <Box
                      key={sentence.id}
                      style={{
                        marginBottom: paragraphSpacing,
                        overflow: 'hidden', // clearfix for float
                      }}
                    >
                      <DropCap
                        char={firstChar}
                        fontFamily={fontFamily.heading}
                        bodyFontSize={bodyStyle.fontSize}
                        bodyLineHeight={bodyStyle.lineHeight}
                        color={headingStyle.color}
                      />
                      <Text
                        span
                        style={{
                          textIndent: 0,
                        }}
                      >
                        {rest}
                      </Text>
                    </Box>
                  );
                }

                return (
                  <Box
                    key={sentence.id}
                    component="p"
                    style={{
                      margin: 0,
                      marginBottom: paragraphSpacing,
                      textIndent: isFirstSentence ? 0 : firstLineIndent,
                    }}
                  >
                    {text}
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}
    </>
  );
}
