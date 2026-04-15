import type { DocumentTemplate } from '@/types/document-template';
import { FONT_PAIRS } from '../fonts';

export const textbookTemplate: DocumentTemplate = {
  id: 'textbook',
  name: '교재',
  description: '교과서 스타일, 넓은 외측 여백, 섹션 번호, 회색 밴드 제목',

  page: {
    width: 210,
    height: 297,
    margin: { top: 20, right: 20, bottom: 25, left: 25 },
    columnCount: 1,
    columnGap: 0,
  },

  typography: {
    fontFamily: FONT_PAIRS.textbook,
    scale: {
      documentTitle: {
        fontSize: 26, fontWeight: 700, lineHeight: 1.3,
        letterSpacing: -0.01, color: '#000', marginTop: 0, marginBottom: 20,
      },
      sectionHeading: {
        fontSize: 16, fontWeight: 700, lineHeight: 1.4,
        letterSpacing: 0, color: '#111', marginTop: 28, marginBottom: 14,
      },
      body: {
        fontSize: 13, fontWeight: 400, lineHeight: 1.8,
        letterSpacing: 0, color: '#1a1a1a', marginTop: 0, marginBottom: 0,
      },
      caption: {
        fontSize: 10, fontWeight: 400, lineHeight: 1.4,
        letterSpacing: 0, color: '#777', marginTop: 0, marginBottom: 0,
      },
      pageNumber: {
        fontSize: 10, fontWeight: 600, lineHeight: 1,
        letterSpacing: 0, color: '#555', marginTop: 0, marginBottom: 0,
      },
      headerFooter: {
        fontSize: 9, fontWeight: 500, lineHeight: 1,
        letterSpacing: 0.02, color: '#888', marginTop: 0, marginBottom: 0,
      },
    },
    paragraphSpacing: 12,
    firstLineIndent: 0,
    textAlign: 'left',
  },

  layout: {
    coverPage: true,
    tocPage: true,
    headerFooter: {
      showHeader: true,
      showFooter: true,
      headerContent: 'section',
      footerContent: 'pageNumber',
      pageNumberPosition: 'outside',
      headerDivider: false,
      footerDivider: false,
    },
    sectionBreak: 'newPage',
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
      titlePosition: 'center',
      titleFontSize: 32,
      subtitleFontSize: 14,
      showDate: true,
      showAuthor: true,
      borderFrame: true,
      verticalRule: false,
    },
    blockquote: {
      borderLeftWidth: 3, borderLeftColor: '#aaa',
      paddingLeft: 16, fontStyle: 'normal', fontSize: 12,
    },
    table: {
      headerBackground: '#e8e8e8', headerColor: '#111',
      borderColor: '#d0d0d0', cellPadding: 10, fontSize: 12,
    },
    list: {
      bulletType: 'number', indent: 24, spacing: 8,
    },
  },
};
