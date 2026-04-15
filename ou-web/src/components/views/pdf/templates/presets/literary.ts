import type { DocumentTemplate } from '@/types/document-template';
import { FONT_PAIRS } from '../fonts';

export const literaryTemplate: DocumentTemplate = {
  id: 'literary',
  name: '문학',
  description: '에세이/소설 스타일, 전체 세리프, 드롭캡, 넉넉한 행간',

  page: {
    width: 210,
    height: 297,
    margin: { top: 30, right: 30, bottom: 35, left: 30 },
    columnCount: 1,
    columnGap: 0,
  },

  typography: {
    fontFamily: FONT_PAIRS.literary,
    scale: {
      documentTitle: {
        fontSize: 20, fontWeight: 600, lineHeight: 1.5,
        letterSpacing: 0.02, color: '#111', marginTop: 0, marginBottom: 28,
      },
      sectionHeading: {
        fontSize: 15, fontWeight: 600, lineHeight: 1.5,
        letterSpacing: 0.01, color: '#222', marginTop: 48, marginBottom: 20,
      },
      body: {
        fontSize: 13, fontWeight: 400, lineHeight: 2.0,
        letterSpacing: 0.01, color: '#1a1a1a', marginTop: 0, marginBottom: 0,
      },
      caption: {
        fontSize: 10, fontWeight: 400, lineHeight: 1.5,
        letterSpacing: 0, color: '#888', marginTop: 0, marginBottom: 0,
      },
      pageNumber: {
        fontSize: 10, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0, color: '#aaa', marginTop: 0, marginBottom: 0,
      },
      headerFooter: {
        fontSize: 9, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0.05, color: '#bbb', marginTop: 0, marginBottom: 0,
      },
    },
    paragraphSpacing: 16,
    firstLineIndent: 28,
    textAlign: 'justify',
  },

  layout: {
    coverPage: true,
    tocPage: false,
    headerFooter: {
      showHeader: false,
      showFooter: true,
      headerContent: 'none',
      footerContent: 'pageNumber',
      pageNumberPosition: 'center',
      headerDivider: false,
      footerDivider: false,
    },
    sectionBreak: 'continuous',
    dropCap: true,
  },

  decoration: {
    pageBorder: {
      enabled: false, width: 0, color: 'transparent',
      style: 'none', inset: 0,
    },
    sectionDivider: { type: 'ornament', color: '#bbb' },
    pullQuoteStyle: 'centered-rule',
  },

  components: {
    cover: {
      titlePosition: 'center',
      titleFontSize: 24,
      subtitleFontSize: 13,
      showDate: false,
      showAuthor: true,
      borderFrame: false,
      verticalRule: false,
    },
    blockquote: {
      borderLeftWidth: 0, borderLeftColor: 'transparent',
      paddingLeft: 32, fontStyle: 'italic', fontSize: 13,
    },
    table: {
      headerBackground: 'transparent', headerColor: '#111',
      borderColor: '#ccc', cellPadding: 8, fontSize: 12,
    },
    list: {
      bulletType: 'dash', indent: 24, spacing: 8,
    },
  },
};
