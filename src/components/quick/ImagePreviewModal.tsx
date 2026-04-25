'use client';

import { CSSProperties, useEffect, useState } from 'react';

interface ImagePreviewModalProps {
  previewUrl: string;
  ocrText: string;
  imageUrl: string | null;
  onClose: () => void;
  onSaved: (nodeId: string | null, domain: string | null) => void;
}

export function ImagePreviewModal({ previewUrl, ocrText: initialText, imageUrl, onClose, onSaved }: ImagePreviewModalProps) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => { URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  async function handleSave() {
    if (saving || !text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/quick/image?confirm=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText: text.trim(), imageUrl }),
      });
      if (!res.ok) throw new Error('저장 실패');
      const data = await res.json() as { nodeId: string | null; domain: string | null };
      onSaved(data.nodeId, data.domain);
    } catch (e) {
      console.error('[ImagePreviewModal]', e);
    } finally {
      setSaving(false);
    }
  }

  const overlay: CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.42)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        width: '100%', maxWidth: 720,
        maxHeight: '82vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '14px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,0,0,0.75)', fontFamily: 'var(--ou-font-body)' }}>
            이미지 인식 결과
          </span>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'rgba(0,0,0,0.3)', padding: 4 }}>
            ×
          </button>
        </div>

        {/* 본문: 이미지 | 텍스트 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 0 }}>
          {/* 왼쪽: 원본 이미지 */}
          <div style={{
            width: 280, flexShrink: 0,
            background: 'rgba(0,0,0,0.03)',
            borderRight: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="업로드된 이미지"
              style={{
                maxWidth: '100%', maxHeight: 320,
                borderRadius: 8,
                objectFit: 'contain',
                boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
              }}
            />
          </div>

          {/* 오른쪽: OCR 텍스트 편집 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.06em', marginBottom: 8, fontFamily: 'var(--ou-font-body)' }}>
              인식된 텍스트 (수정 가능)
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                lineHeight: 1.7,
                color: 'rgba(0,0,0,0.8)',
                fontFamily: 'var(--ou-font-mono)',
                background: 'rgba(0,0,0,0.015)',
                outline: 'none',
                minHeight: 180,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.3)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)')}
            />
          </div>
        </div>

        {/* 하단 */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button type="button" onClick={onClose}
            style={{
              padding: '8px 18px', background: 'transparent',
              color: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 9, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--ou-font-body)',
            }}>취소</button>
          <button type="button" onClick={handleSave} disabled={saving || !text.trim()}
            style={{
              padding: '8px 18px', background: saving || !text.trim() ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.88)',
              color: saving || !text.trim() ? 'rgba(0,0,0,0.35)' : '#fff',
              border: 'none', borderRadius: 9,
              fontSize: 13, fontWeight: 600,
              cursor: saving || !text.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--ou-font-body)',
            }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
