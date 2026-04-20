/**
 * LLM 응답에서 내부 메타블록을 제거합니다.
 * 서버/클라이언트 양쪽에서 사용 가능한 이중 방어 유틸.
 *
 * 대상 패턴:
 *   ```json:meta {...} ```  — 도메인 힌트, suggestions
 *   ```json:view {...} ```  — 뷰 호출 지시
 */
const META_PATTERNS: RegExp[] = [
  /```json:meta[\s\S]*?```/g,  // 닫힌 블록
  /```json:view[\s\S]*?```/g,  // 닫힌 블록
  /```json:meta[\s\S]*/g,      // 미완성 블록 (끝까지)
  /```json:view[\s\S]*/g,      // 미완성 블록 (끝까지)
];

export function stripLLMMeta(text: string): string {
  let result = text;
  for (const pattern of META_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}
