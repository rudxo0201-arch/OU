import { modals } from '@mantine/modals';

export function confirmViewGeneration(
  estimatedTokens: number,
  onConfirm: () => void
) {
  modals.openConfirmModal({
    title: '토큰 사용 안내',
    children: `이 작업은 채팅 약 ${estimatedTokens}턴 분량을 사용해요.`,
    labels: { confirm: '생성하기', cancel: '취소' },
    onConfirm,
  });
}
