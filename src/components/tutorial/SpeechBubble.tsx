'use client';

import { NeuButton } from '@/components/ds';
import styles from './SpeechBubble.module.css';

interface Props {
  message: string;
  tail?: 'top' | 'bottom' | 'left';
  /** absolute 위치 (부모 기준) */
  style?: React.CSSProperties;
  onSkip?: () => void;
  /** 확인/다음 버튼 텍스트 (없으면 버튼 숨김) */
  confirmLabel?: string;
  onConfirm?: () => void;
}

export function SpeechBubble({ message, tail = 'bottom', style, onSkip, confirmLabel, onConfirm }: Props) {
  return (
    <div
      className={`${styles.bubble} ${styles[`tail-${tail}`]}`}
      style={style}
    >
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {onSkip && (
          <button className={styles.skipBtn} onClick={onSkip}>
            건너뛰기
          </button>
        )}
        {confirmLabel && onConfirm && (
          <NeuButton size="sm" onClick={onConfirm} style={{ marginLeft: 'auto' }}>
            {confirmLabel}
          </NeuButton>
        )}
      </div>
    </div>
  );
}

/** 편집 모드 리사이즈 힌트 점 (우하단) */
export function ResizePulseHint({ style }: { style?: React.CSSProperties }) {
  return <div className={styles.pulseHint} style={style} />;
}
