import type { TriplePredicate } from '@/types';

/**
 * 한국어 받침(종성) 존재 여부 판별
 * 마지막 글자가 한글이고 받침이 있으면 true
 */
function hasBatchim(word: string): boolean {
  const lastChar = word.charAt(word.length - 1);
  const code = lastChar.charCodeAt(0);
  // 한글 유니코드 범위: 0xAC00 ~ 0xD7A3
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return (code - 0xAC00) % 28 !== 0;
}

/** 은/는 */
function eunNeun(word: string): string {
  return hasBatchim(word) ? '은' : '는';
}

/** 이/가 */
function iGa(word: string): string {
  return hasBatchim(word) ? '이' : '가';
}

/** 을/를 */
function eulReul(word: string): string {
  return hasBatchim(word) ? '을' : '를';
}

/** 와/과 */
function waGwa(word: string): string {
  return hasBatchim(word) ? '과' : '와';
}

/** 서술어별 일상 문장 템플릿 */
const PREDICATE_TEMPLATES: Record<TriplePredicate, (s: string, o: string) => string> = {
  is_a:        (s, o) => `${s}${eunNeun(s)} ${o}의 일종이에요`,
  part_of:     (s, o) => `${s}${eunNeun(s)} ${o}에 포함돼요`,
  causes:      (s, o) => `${s}${eunNeun(s)} ${o}에 영향을 줘요`,
  derived_from:(s, o) => `${s}${eunNeun(s)} ${o}에서 유래했어요`,
  related_to:  (s, o) => `${s}${eunNeun(s)} ${o}${waGwa(o)} 관련이 있어요`,
  opposite_of: (s, o) => `${s}${eunNeun(s)} ${o}의 반대예요`,
  requires:    (s, o) => `${s}${eunNeun(s)} ${o}${iGa(o)} 필요해요`,
  example_of:  (s, o) => `${s}${eunNeun(s)} ${o}의 한 예시예요`,
  involves:    (s, o) => `${s}에는 ${o}${iGa(o)} 관여돼요`,
  located_at:  (s, o) => `${s}${eunNeun(s)} ${o}에 있어요`,
  occurs_at:   (s, o) => `${s}${eunNeun(s)} ${o}에서 일어나요`,
};

/** 트리플 하나를 일상 문장으로 변환 */
export function tripleToSentence(triple: {
  subject: string;
  predicate: TriplePredicate;
  object: string;
}): string {
  const template = PREDICATE_TEMPLATES[triple.predicate];
  if (!template) return `${triple.subject} → ${triple.object}`;
  return template(triple.subject, triple.object);
}

/** 트리플 배열을 문단으로 변환 */
export function triplesToParagraph(triples: Array<{
  subject: string;
  predicate: TriplePredicate;
  object: string;
}>): string {
  return triples.map(tripleToSentence).join('\n');
}

export { hasBatchim, eunNeun, iGa, eulReul, waGwa };
