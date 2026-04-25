'use client';

import { useEffect, useRef, useState } from 'react';
import { X, FolderOpen, ChevronRight } from 'lucide-react';
import { useFolderStore, loadAutoFolders } from '@/stores/folderStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FolderPanel({ open, onClose }: Props) {
  const { autoFolders, selectedFolder, selectFolder } = useFolderStore();
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    loadAutoFolders().then(() => setLoaded(true));
  }, [open, loaded]);

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: 68, top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 150,
        width: 220, maxHeight: '70vh',
        background: 'rgba(12,12,18,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'folder-panel-in 0.22s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <style>{`
        @keyframes folder-panel-in {
          from { opacity: 0; transform: translateY(-50%) translateX(-12px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}</style>

      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderOpen size={13} strokeWidth={1.5} color="rgba(255,255,255,0.45)" />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            데이터
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.25)', padding: 2, borderRadius: 4,
          display: 'flex', alignItems: 'center', transition: 'color 120ms ease',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          <X size={13} />
        </button>
      </div>

      {/* 섹션 레이블 */}
      <div style={{ padding: '10px 14px 4px', flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
          자동 폴더
        </span>
      </div>

      {/* 도메인 폴더 목록 */}
      <div style={{ overflowY: 'auto', padding: '2px 6px 10px', flex: 1 }}>
        {!loaded ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            불러오는 중...
          </div>
        ) : autoFolders.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            데이터가 없습니다
          </div>
        ) : (
          autoFolders.map(f => {
            const isSelected = selectedFolder === f.key;
            return (
              <FolderRow
                key={f.key}
                icon={f.icon}
                label={f.label}
                count={f.count}
                selected={isSelected}
                onClick={() => selectFolder(f.key)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function FolderRow({ icon, label, count, selected, onClick }: {
  icon: string; label: string; count: number; selected: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 8px', borderRadius: 8,
        background: selected
          ? 'rgba(255,255,255,0.10)'
          : hovered ? 'rgba(255,255,255,0.06)' : 'none',
        border: selected ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
        cursor: 'pointer', transition: 'all 120ms ease',
      }}
    >
      <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: selected ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.65)', flex: 1, textAlign: 'left' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{count}</span>
      <ChevronRight size={11} strokeWidth={1.5} color="rgba(255,255,255,0.18)" style={{ flexShrink: 0 }} />
    </button>
  );
}
