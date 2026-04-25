'use client';

import { useState } from 'react';
import { FolderOpen, Network, Search } from 'lucide-react';
import { useHomeViewStore } from '@/stores/homeViewStore';

function IconBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--ou-surface)' : 'none',
        border: active ? '1px solid var(--ou-border)' : '1px solid transparent',
        borderRadius: 10,
        cursor: 'pointer',
        color: active || hovered ? 'var(--ou-text)' : 'var(--ou-text-muted)',
        transition: 'all 160ms ease',
        filter: active || hovered ? 'drop-shadow(0 0 6px rgba(255,255,255,0.25))' : 'none',
      }}
    >
      {icon}
    </button>
  );
}

export function LeftIconBar() {
  const { activeView, toggleView } = useHomeViewStore();

  return (
    <div style={{
      position: 'fixed',
      left: 0, top: 56, bottom: 0,
      width: 60,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <IconBtn
        icon={<FolderOpen size={18} strokeWidth={1.5} />}
        label="폴더"
        active={false}
        onClick={() => window.dispatchEvent(new CustomEvent('left-folder-open'))}
      />
      <IconBtn
        icon={<Network size={18} strokeWidth={1.5} />}
        label="그래프 뷰"
        active={activeView === 'graph'}
        onClick={() => toggleView('graph')}
      />
      <IconBtn
        icon={<Search size={18} strokeWidth={1.5} />}
        label="검색"
        active={false}
        onClick={() => window.dispatchEvent(new CustomEvent('left-search-open'))}
      />
    </div>
  );
}
