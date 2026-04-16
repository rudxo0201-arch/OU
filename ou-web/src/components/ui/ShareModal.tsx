'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Lock, Link as LinkIcon, Globe } from '@phosphor-icons/react';
import type { Visibility } from '@/types';

interface ShareModalProps {
  opened: boolean;
  onClose: () => void;
  nodeId: string;
  title?: string;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: React.ElementType; tip: string }[] = [
  { value: 'private', label: '비공개', icon: Lock, tip: '나만 볼 수 있어요' },
  { value: 'link', label: '링크 공유', icon: LinkIcon, tip: '링크를 가진 사람만 볼 수 있어요' },
  { value: 'public', label: '전체 공개', icon: Globe, tip: '누구나 볼 수 있어요' },
];

export function ShareModal({ opened, onClose, nodeId, title }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/view/${nodeId}`
    : `https://ouuniverse.com/view/${nodeId}`;

  const ogImageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/og/${nodeId}`
    : `https://ouuniverse.com/api/og/${nodeId}`;

  // Load current visibility when modal opens
  useEffect(() => {
    if (!opened) return;
    setCopied(false);

    (async () => {
      try {
        const res = await fetch(`/api/nodes/${nodeId}/visibility`);
        if (res.ok) {
          const data = await res.json();
          setVisibility(data.visibility ?? 'private');
        }
      } catch {
        // Silent -- keep default
      }
    })();
  }, [opened, nodeId]);

  // Close on Escape
  useEffect(() => {
    if (!opened) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [opened, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVisibilityChange = async (newValue: Visibility) => {
    const prev = visibility;
    setVisibility(newValue);
    setVisibilityLoading(true);

    try {
      const res = await fetch(`/api/nodes/${nodeId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newValue }),
      });
      if (!res.ok) {
        setVisibility(prev);
      }
    } catch {
      setVisibility(prev);
    } finally {
      setVisibilityLoading(false);
    }
  };

  const isShareable = visibility !== 'private';

  if (!opened) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--ou-glass-bg, rgba(20,20,30,0.95))',
          border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          margin: '0 16px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>공유</span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ou-text-muted, rgba(255,255,255,0.5))',
              fontSize: 18,
              padding: 4,
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Visibility selector */}
          <div>
            <span style={{ fontSize: 12, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))', display: 'block', marginBottom: 8 }}>공개 범위</span>
            <div
              style={{
                display: 'flex',
                border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
                borderRadius: 8,
                overflow: 'hidden',
                opacity: visibilityLoading ? 0.6 : 1,
                pointerEvents: visibilityLoading ? 'none' : 'auto',
              }}
            >
              {VISIBILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  title={opt.tip}
                  onClick={() => handleVisibilityChange(opt.value)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 4px',
                    background: visibility === opt.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: visibility === opt.value ? 'var(--ou-text-body, #fff)' : 'var(--ou-text-muted, rgba(255,255,255,0.5))',
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
          </div>

          {/* Share link */}
          <div>
            <span style={{ fontSize: 12, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))', display: 'block', marginBottom: 8 }}>링크</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: isShareable ? 'var(--ou-text-body, #fff)' : 'var(--ou-text-muted, rgba(255,255,255,0.5))',
                  outline: 'none',
                  font: 'inherit',
                }}
              />
              <button
                title={copied ? '복사됨!' : '링크 복사'}
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: 'var(--ou-text-muted, rgba(255,255,255,0.5))',
                  padding: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                }}
              >
                {copied ? <Check size={18} weight="bold" /> : <Copy size={18} weight="light" />}
              </button>
            </div>
            {!isShareable && (
              <span style={{ fontSize: 11, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))', marginTop: 4, display: 'block' }}>
                비공개 상태에서는 본인만 접근할 수 있어요. 공유하려면 공개 범위를 변경하세요.
              </span>
            )}
          </div>

          {/* OG preview */}
          {isShareable && (
            <div>
              <span style={{ fontSize: 12, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))', display: 'block', marginBottom: 8 }}>미리보기</span>
              <div
                style={{
                  border: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={ogImageUrl}
                  alt="공유 미리보기"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <div style={{ padding: '8px 12px', borderTop: '0.5px solid var(--ou-border-muted, rgba(255,255,255,0.14))' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title ?? 'OU'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ou-text-muted, rgba(255,255,255,0.5))', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ouuniverse.com
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
