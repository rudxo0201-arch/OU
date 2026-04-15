import type { DocumentTemplate } from '@/types/document-template';
import { FONT_PAIRS } from '../fonts';

export const reportTemplate: DocumentTemplate = {
  id: 'report',
  name: '보고서',
  description: '비즈니스 보고서, 깔끔한 구조, 세로 바 강조',

  page: {
    width: 210,
    height: 297,
    margin: { top: 25, right: 25, bottom: 25, left: 25 },
    columnCount: 1,
    columnGap: 0,
  },

  typography: {
    fontFamily: FONT_PAIRS.report,
    scale: {
      documentTitle: {
        fontSize: 22, fontWeight: 600, lineHeight: 1.3,
        letterSpacing: -0.01, color: '#000', marginTop: 0, marginBottom: 20,
      },
      sectionHeading: {
        fontSize: 15, fontWeight: 600, lineHeight: 1.4,
        letterSpacing: 0, color: '#111', marginTop: 32, marginBottom: 12,
      },
      body: {
        fontSize: 12, fontWeight: 400, lineHeight: 1.7,
        letterSpacing: 0, color: '#222', marginTop: 0, marginBottom: 0,
      },
      caption: {
        fontSize: 10, fontWeight: 400, lineHeight: 1.4,
        letterSpacing: 0, color: '#888', marginTop: 0, marginBottom: 0,
      },
      pageNumber: {
        fontSize: 9, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0, color: '#888', marginTop: 0, marginBottom: 0,
      },
      headerFooter: {
        fontSize: 9, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0, color: '#aaa', marginTop: 0, marginBottom: 0,
      },
    },
    paragraphSpacing: 14,
    firstLineIndent: 0,
    textAlign: 'left',
  },

  layout: {
    coverPage: true,
    tocPage: true,
    headerFooter: {
      showHeader: true,
      showFooter: true,
      headerContent: 'title',
      footerContent: 'pageNumber',
      pageNumberPosition: 'right',
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
    sectionDivider: { type: 'line', color: '#e0e0e0' },
    pullQuoteStyle: 'border-left',
  },

  components: {
    cover: {
      titlePosition: 'top-left',
      titleFontSize: 28,
      subtitleFontSize: 13,
      showDate: true,
      showAuthor: true,
      borderFrame: false,
      verticalRule: false,
    },
    blockquote: {
      borderLeftWidth: 4, borderLeftColor: '#333',
      paddingLeft: 16, fontStyle: 'normal', fontSize: 12,
    },
    table: {
      headerBackground: '#f5f5f5', headerColor: '#111',
      borderColor: '#ddd', cellPadding: 10, fontSize: 11,
    },
    list: {
      bulletType: 'disc', indent: 20, spacing: 6,
    },
  },
};
