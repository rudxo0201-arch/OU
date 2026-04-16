'use client';

import { Lock, Link, Globe, LockSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import type { Visibility } from '@/types';

interface VisibilityToggleProps {
  nodeId: string;
  currentVisibility: Visibility;
  onChange?: (v: Visibility) => void;
  /** domain_data._visibility_locked === true 이면 변경 불가 */
  locked?: boolean;
}

const OPTIONS: { value: Visibility; label: string; icon: React.ElementType; tip: string }[] = [
  { value: 'private', label: '비공개', icon: Lock, tip: '나만 볼 수 있어요' },
  { value: 'link', label: '링크 공유', icon: Link, tip: '링크를 가진 사람만 볼 수 있어요' },
  { value: 'public', label: '전체 공개', icon: Globe, tip: '누구나 볼 수 있어요' },
];

const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: '비공개',
  link: '링크 공유',
  public: '전체 공개',
};

export function VisibilityToggle({ nodeId, currentVisibility, onChange, locked }: VisibilityToggleProps) {
  const [value, setValue] = useState<Visibility>(currentVisibility);
  const [loading, setLoading] = useState(false);

  // 잠김 상태: 읽기 전용 표시
  if (locked) {
    return (
      <div
        title="운영 데이터는 비공개로 고정됩니다"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 6,
          background: 'rgba(255,255,255,0.05)',
          border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
          opacity: 0.7,
          cursor: 'not-allowed',
        }}
      >
        <LockSimple size={16} weight="light" />
        <span style={{ fontSize: 12, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))' }}>{VISIBILITY_LABELS[currentVisibility]}</span>
      </div>
    );
  }

  const handleChange = async (newValue: Visibility) => {
    setValue(newValue);
    setLoading(true);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newValue }),
      });
      if (!res.ok) {
        setValue(currentVisibility);
      } else {
        onChange?.(newValue);
      }
    } catch {
      setValue(currentVisibility);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
        borderRadius: 8,
        overflow: 'hidden',
        opacity: loading ? 0.6 : 1,
        pointerEvents: loading ? 'none' : 'auto',
      }}
    >
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          title={opt.tip}
          onClick={() => handleChange(opt.value)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '8px 4px',
            background: value === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: value === opt.value ? 'var(--ou-text-body, #fff)' : 'var(--ou-text-muted, rgba(255,255,255,0.5))',
            fontSize: 12,
            font: 'inherit',
            transition: 'all 150ms ease',
          }}
        >
          <opt.icon size={16} weight="light" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
