export function confirmViewGeneration(
  estimatedTokens: number,
  onConfirm: () => void
) {
  const confirmed = window.confirm(`이 작업은 채팅 약 ${estimatedTokens}턴 분량을 사용해요. 계속할까요?`);
  if (confirmed) {
    onConfirm();
  }
}
