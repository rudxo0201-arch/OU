'use client';

import { Plus } from '@phosphor-icons/react';

export interface ViewOrb {
  id: string;
  label: string;
  icon?: string;
  active?: boolean;
}

interface ViewOrbDockProps {
  orbs: ViewOrb[];
  onOrbClick: (id: string) => void;
  onAddClick: () => void;
  editMode?: boolean;
}

export function ViewOrbDock({ orbs, onOrbClick, onAddClick, editMode }: ViewOrbDockProps) {
  return (
    <div style={{
      position: 'fixed',
      right: 20,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* ⊕ 새 뷰 추가 */}
      <button
        onClick={onAddClick}
        title="뷰 추가"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1.5px dashed var(--ou-border-muted, rgba(255,255,255,0.14))',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ou-text-dimmed, rgba(255,255,255,0.4))',
          transition: 'all 150ms',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
          e.currentTarget.style.color = 'var(--ou-text-body)';
          e.currentTarget.style.boxShadow = 'var(--ou-glow-hover)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--ou-border-muted)';
          e.currentTarget.style.color = 'var(--ou-text-dimmed)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Plus size={18} weight="bold" />
      </button>

      {/* 뷰 오브들 */}
      {orbs.map(orb => (
        <button
          key={orb.id}
          onClick={() => onOrbClick(orb.id)}
          title={orb.label}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `1.5px solid ${orb.active ? 'var(--ou-border-strong, rgba(255,255,255,0.30))' : 'var(--ou-border-muted, rgba(255,255,255,0.14))'}`,
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: 'var(--ou-text-body, rgba(255,255,255,0.7))',
            boxShadow: orb.active ? 'var(--ou-glow-md)' : 'none',
            transition: 'all 150ms',
            padding: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.12)';
            e.currentTarget.style.boxShadow = 'var(--ou-glow-hover)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = orb.active ? 'var(--ou-glow-md)' : 'none';
          }}
        >
          {orb.icon || orb.label.charAt(0).toUpperCase()}
        </button>
      ))}
    </div>
  );
}
