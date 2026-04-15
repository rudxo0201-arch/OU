// 템플릿 레지스트리 — 등록만으로 확장
import type { DocumentTemplate } from '@/types/document-template';
import { minimalTemplate } from './presets/minimal';
import { academicTemplate } from './presets/academic';
import { magazineTemplate } from './presets/magazine';
import { reportTemplate } from './presets/report';
import { textbookTemplate } from './presets/textbook';
import { literaryTemplate } from './presets/literary';

export const DOCUMENT_TEMPLATES: Record<string, DocumentTemplate> = {
  minimal: minimalTemplate,
  academic: academicTemplate,
  magazine: magazineTemplate,
  report: reportTemplate,
  textbook: textbookTemplate,
  literary: literaryTemplate,
};

export const TEMPLATE_LIST = Object.values(DOCUMENT_TEMPLATES);

export const DEFAULT_TEMPLATE_ID = 'minimal';

export function getTemplate(id: string): DocumentTemplate {
  return DOCUMENT_TEMPLATES[id] ?? DOCUMENT_TEMPLATES[DEFAULT_TEMPLATE_ID];
}
