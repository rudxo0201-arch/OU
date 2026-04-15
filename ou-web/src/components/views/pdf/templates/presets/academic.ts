import type { DocumentTemplate } from '@/types/document-template';
import { FONT_PAIRS } from '../fonts';

export const academicTemplate: DocumentTemplate = {
  id: 'academic',
  name: '논문',
  description: '학술 논문 스타일, 세리프 제목, 양쪽 정렬',

  page: {
    width: 210,
    height: 297,
    margin: { top: 25, right: 30, bottom: 25, left: 30 },
    columnCount: 1,
    columnGap: 0,
  },

  typography: {
    fontFamily: FONT_PAIRS.academic,
    scale: {
      documentTitle: {
        fontSize: 24, fontWeight: 700, lineHeight: 1.3,
        letterSpacing: -0.01, color: '#000', marginTop: 0, marginBottom: 24,
      },
      sectionHeading: {
        fontSize: 16, fontWeight: 600, lineHeight: 1.5,
        letterSpacing: -0.01, color: '#111', marginTop: 36, marginBottom: 12,
      },
      body: {
        fontSize: 12, fontWeight: 400, lineHeight: 1.8,
        letterSpacing: 0, color: '#1a1a1a', marginTop: 0, marginBottom: 0,
      },
      caption: {
        fontSize: 10, fontWeight: 400, lineHeight: 1.4,
        letterSpacing: 0, color: '#666', marginTop: 0, marginBottom: 0,
      },
      pageNumber: {
        fontSize: 10, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0, color: '#666', marginTop: 0, marginBottom: 0,
      },
      headerFooter: {
        fontSize: 9, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0, color: '#888', marginTop: 0, marginBottom: 0,
      },
    },
    paragraphSpacing: 12,
    firstLineIndent: 24,
    textAlign: 'justify',
  },

  layout: {
    coverPage: true,
    tocPage: true,
    headerFooter: {
      showHeader: true,
      showFooter: true,
      headerContent: 'title',
      footerContent: 'pageNumber',
      pageNumberPosition: 'center',
      headerDivider: true,
      footerDivider: false,
    },
    sectionBreak: 'continuous',
    dropCap: false,
  },

  decoration: {
    pageBorder: {
      enabled: false, width: 0, color: 'transparent',
      style: 'none', inset: 0,
    },
    sectionDivider: { type: 'dots', color: '#ccc' },
    pullQuoteStyle: 'border-left',
  },

  components: {
    cover: {
      titlePosition: 'center',
      titleFontSize: 28,
      subtitleFontSize: 14,
      showDate: true,
      showAuthor: true,
      borderFrame: false,
      verticalRule: false,
    },
    blockquote: {
      borderLeftWidth: 3, borderLeftColor: '#ccc',
      paddingLeft: 16, fontStyle: 'normal', fontSize: 11,
    },
    table: {
      headerBackground: '#f0f0f0', headerColor: '#000',
      borderColor: '#ccc', cellPadding: 8, fontSize: 11,
    },
    list: {
      bulletType: 'disc', indent: 24, spacing: 6,
    },
  },
};
