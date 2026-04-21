'use client';
import { NeuButton } from '@/components/ds';

interface BatchActionBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  deleting?: boolean;
}

export function BatchActionBar({ count, onClear, onDelete, deleting }: BatchActionBarProps) {
  if (count === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      borderRadius: 'var(--ou-radius-lg)',
      background: 'var(--ou-bg)',
      boxShadow: 'var(--ou-neu-raised-md)',
      border: '1px solid var(--ou-border-subtle)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ou-text-body)', whiteSpace: 'nowrap' }}>
        {count}개 선택됨
      </span>
      <NeuButton variant="ghost" size="sm" onClick={onClear} style={{ color: 'var(--ou-text-muted)' }}>
        선택 해제
      </NeuButton>
      <NeuButton
        variant="default"
        size="sm"
        onClick={onDelete}
        disabled={deleting}
        style={{ color: 'var(--ou-text-muted)' }}
      >
        {deleting ? '삭제 중…' : '선택 삭제'}
      </NeuButton>
    </div>
  );
}
