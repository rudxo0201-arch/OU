import type { DocumentTemplate } from '@/types/document-template';
import { FONT_PAIRS } from '../fonts';

export const minimalTemplate: DocumentTemplate = {
  id: 'minimal',
  name: '미니멀',
  description: '넓은 여백, 장식 없음, 콘텐츠에 집중',

  page: {
    width: 210,
    height: 297,
    margin: { top: 35, right: 35, bottom: 35, left: 35 },
    columnCount: 1,
    columnGap: 0,
  },

  typography: {
    fontFamily: FONT_PAIRS.minimal,
    scale: {
      documentTitle: {
        fontSize: 20, fontWeight: 300, lineHeight: 1.4,
        letterSpacing: 0.1, color: '#111', marginTop: 0, marginBottom: 32,
      },
      sectionHeading: {
        fontSize: 14, fontWeight: 400, lineHeight: 1.5,
        letterSpacing: 0.06, color: '#333', marginTop: 40, marginBottom: 16,
      },
      body: {
        fontSize: 12, fontWeight: 400, lineHeight: 2.0,
        letterSpacing: 0, color: '#222', marginTop: 0, marginBottom: 0,
      },
      caption: {
        fontSize: 9, fontWeight: 400, lineHeight: 1.4,
        letterSpacing: 0, color: '#999', marginTop: 0, marginBottom: 0,
      },
      pageNumber: {
        fontSize: 8, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0.05, color: '#bbb', marginTop: 0, marginBottom: 0,
      },
      headerFooter: {
        fontSize: 8, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0.05, color: '#bbb', marginTop: 0, marginBottom: 0,
      },
    },
    paragraphSpacing: 24,
    firstLineIndent: 0,
    textAlign: 'left',
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
    dropCap: false,
  },

  decoration: {
    pageBorder: {
      enabled: false, width: 0, color: 'transparent',
      style: 'none', inset: 0,
    },
    sectionDivider: { type: 'space', color: 'transparent' },
    pullQuoteStyle: 'large-italic',
  },

  components: {
    cover: {
      titlePosition: 'center',
      titleFontSize: 28,
      subtitleFontSize: 12,
      showDate: true,
      showAuthor: false,
      borderFrame: false,
      verticalRule: false,
    },
    blockquote: {
      borderLeftWidth: 1, borderLeftColor: '#ddd',
      paddingLeft: 20, fontStyle: 'italic', fontSize: 12,
    },
    table: {
      headerBackground: '#f5f5f5', headerColor: '#111',
      borderColor: '#e0e0e0', cellPadding: 10, fontSize: 11,
    },
    list: {
      bulletType: 'dash', indent: 20, spacing: 8,
    },
  },
};
