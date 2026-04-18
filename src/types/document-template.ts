// PDF 출판 뷰 — 문서 템플릿 타입 시스템
// 출판사/잡지급 편집 품질을 위한 완전한 디자인 토큰 정의

// ── 기본 단위 ──

export interface TypeStyle {
  fontSize: number;        // px
  fontWeight: number;      // 100~900
  lineHeight: number;      // 배수 (1.2, 1.8 등)
  letterSpacing: number;   // em 단위 (-0.03, 0, 0.05 등)
  color: string;           // CSS color (grayscale only)
  marginTop: number;       // px
  marginBottom: number;    // px
}

// ── 페이지 설정 ──

export interface PageConfig {
  width: number;           // mm (A4 = 210)
  height: number;          // mm (A4 = 297)
  margin: {
    top: number;           // mm
    right: number;
    bottom: number;
    left: number;
  };
  columnCount: 1 | 2;
  columnGap: number;       // mm (2단일 때)
}

// ── 타이포그래피 ──

export interface TypographyConfig {
  fontFamily: {
    heading: string;       // 제목 폰트
    body: string;          // 본문 폰트
    caption: string;       // 보조 폰트 (페이지 번호, 캡션 등)
  };
  scale: {
    documentTitle: TypeStyle;
    sectionHeading: TypeStyle;
    body: TypeStyle;
    caption: TypeStyle;
    pageNumber: TypeStyle;
    headerFooter: TypeStyle;
  };
  paragraphSpacing: number;   // 문단 간 간격 (px)
  firstLineIndent: number;    // 첫줄 들여쓰기 (px, 0이면 없음)
  textAlign: 'left' | 'justify';
}

// ── 레이아웃 ──

export interface DocumentLayoutConfig {
  coverPage: boolean;
  tocPage: boolean;
  headerFooter: {
    showHeader: boolean;
    showFooter: boolean;
    headerContent: 'title' | 'section' | 'none';
    footerContent: 'pageNumber' | 'title-pageNumber' | 'none';
    pageNumberPosition: 'center' | 'outside' | 'right';
    headerDivider: boolean;
    footerDivider: boolean;
  };
  sectionBreak: 'continuous' | 'newPage';
  dropCap: boolean;
}

// ── 장식 ──

export interface DecorationConfig {
  pageBorder: {
    enabled: boolean;
    width: number;         // px
    color: string;         // grayscale
    style: 'solid' | 'double' | 'none';
    inset: number;         // mm (테두리 안쪽 여백)
  };
  sectionDivider: {
    type: 'line' | 'dots' | 'space' | 'ornament' | 'none';
    color: string;
  };
  pullQuoteStyle: 'border-left' | 'large-italic' | 'centered-rule';
}

// ── 컴포넌트별 스타일 ──

export interface CoverStyle {
  titlePosition: 'center' | 'bottom-left' | 'top-left';
  titleFontSize: number;
  subtitleFontSize: number;
  showDate: boolean;
  showAuthor: boolean;
  borderFrame: boolean;
  verticalRule: boolean;
}

export interface BlockquoteStyle {
  borderLeftWidth: number;
  borderLeftColor: string;
  paddingLeft: number;
  fontStyle: 'italic' | 'normal';
  fontSize: number;
}

export interface TableStyle {
  headerBackground: string;
  headerColor: string;
  borderColor: string;
  cellPadding: number;
  fontSize: number;
}

export interface ListStyle {
  bulletType: 'disc' | 'circle' | 'dash' | 'number';
  indent: number;
  spacing: number;
}

export interface ComponentStyleMap {
  cover: CoverStyle;
  blockquote: BlockquoteStyle;
  table: TableStyle;
  list: ListStyle;
}

// ── 메인 템플릿 인터페이스 ──

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  page: PageConfig;
  typography: TypographyConfig;
  layout: DocumentLayoutConfig;
  decoration: DecorationConfig;
  components: ComponentStyleMap;
}

// ── 페이지 분할 결과 ──

export interface PageContent {
  pageNumber: number;
  sections: PageSection[];
}

export interface PageSection {
  id: string;
  heading: string | null;
  isHeadingOnThisPage: boolean;  // 제목이 이 페이지에 있는지
  sentences: PageSentence[];
}

export interface PageSentence {
  id: string;
  text: string;
  orderIdx: number;
}

// ── A4 상수 ──

export const A4_WIDTH_PX = 794;    // 210mm at 96dpi
export const A4_HEIGHT_PX = 1123;  // 297mm at 96dpi
export const MM_TO_PX = 3.7795;    // 1mm = 3.7795px at 96dpi
