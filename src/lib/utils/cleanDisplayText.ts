/**
 * 표시용 텍스트에서 LLM 역할 마커, 마크다운 서식을 제거합니다.
 * domain_data.title이 없을 때 raw 텍스트를 fallback으로 쓸 때 사용.
 */
export function cleanDisplayText(text: string): string {
  return text
    // [user], [assistant] 역할 마커 제거
    .replace(/\[user\]\s*/gi, '')
    .replace(/\[assistant\]\s*/gi, '')
    // **bold** → bold
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // *italic* → italic
    .replace(/\*(.*?)\*/g, '$1')
    // `code` → code
    .replace(/`([^`]+)`/g, '$1')
    // Step N: 같은 접두사 제거
    .replace(/^Step\s+\d+:\s*/i, '')
    // 앞뒤 공백 정리
    .trim();
}
