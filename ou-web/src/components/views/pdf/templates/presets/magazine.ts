import type { DocumentTemplate } from '@/types/document-template';
import { FONT_PAIRS } from '../fonts';

export const magazineTemplate: DocumentTemplate = {
  id: 'magazine',
  name: '매거진',
  description: '2단 레이아웃, 드롭캡, 잡지 편집 스타일',

  page: {
    width: 210,
    height: 297,
    margin: { top: 20, right: 15, bottom: 20, left: 15 },
    columnCount: 2,
    columnGap: 8,
  },

  typography: {
    fontFamily: FONT_PAIRS.magazine,
    scale: {
      documentTitle: {
        fontSize: 32, fontWeight: 700, lineHeight: 1.2,
        letterSpacing: -0.03, color: '#000', marginTop: 0, marginBottom: 16,
      },
      sectionHeading: {
        fontSize: 18, fontWeight: 700, lineHeight: 1.3,
        letterSpacing: -0.02, color: '#111', marginTop: 32, marginBottom: 12,
      },
      body: {
        fontSize: 11, fontWeight: 400, lineHeight: 1.7,
        letterSpacing: 0, color: '#1a1a1a', marginTop: 0, marginBottom: 0,
      },
      caption: {
        fontSize: 9, fontWeight: 400, lineHeight: 1.4,
        letterSpacing: 0.02, color: '#777', marginTop: 0, marginBottom: 0,
      },
      pageNumber: {
        fontSize: 9, fontWeight: 400, lineHeight: 1,
        letterSpacing: 0, color: '#888', marginTop: 0, marginBottom: 0,
      },
      headerFooter: {
        fontSize: 8, fontWeight: 500, lineHeight: 1,
        letterSpacing: 0.08, color: '#999', marginTop: 0, marginBottom: 0,
      },
    },
    paragraphSpacing: 8,
    firstLineIndent: 0,
    textAlign: 'justify',
  },

  layout: {
    coverPage: true,
    tocPage: false,
    headerFooter: {
      showHeader: true,
      showFooter: true,
      headerContent: 'section',
      footerContent: 'pageNumber',
      pageNumberPosition: 'outside',
      headerDivider: true,
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
    sectionDivider: { type: 'line', color: '#ddd' },
    pullQuoteStyle: 'large-italic',
  },

  components: {
    cover: {
      titlePosition: 'bottom-left',
      titleFontSize: 40,
      subtitleFontSize: 14,
      showDate: true,
      showAuthor: false,
      borderFrame: false,
      verticalRule: true,
    },
    blockquote: {
      borderLeftWidth: 0, borderLeftColor: 'transparent',
      paddingLeft: 0, fontStyle: 'italic', fontSize: 16,
    },
    table: {
      headerBackground: '#1a1a1a', headerColor: '#fff',
      borderColor: '#e0e0e0', cellPadding: 8, fontSize: 10,
    },
    list: {
      bulletType: 'circle', indent: 16, spacing: 4,
    },
  },
};
