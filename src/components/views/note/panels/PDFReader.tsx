'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, MagnifyingGlass, ArrowCounterClockwise, Download, FilePdf } from '@phosphor-icons/react';

interface Props {
  url?: string;
  fileName?: string;
  onUrlChange?: (url: string, fileName?: string) => void;
}

export function PDFReader({ url: initUrl, fileName: initFileName, onUrlChange }: Props) {
  const [activeUrl, setActiveUrl]     = useState(initUrl ?? '');
  const [fileName, setFileName]       = useState(initFileName ?? '');
  const [inputUrl, setInputUrl]       = useState('');
  const [showInput, setShowInput]     = useState(!initUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const open = (url: string, name?: string) => {
    setActiveUrl(url);
    setFileName(name ?? url.split('/').pop() ?? 'PDF');
    setShowInput(false);
    onUrlChange?.(url, name);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    open(objUrl, file.name);
  };

  // ── URL 입력 화면 ──────────────────────────────────────────
  if (showInput || !activeUrl) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        padding: 32,
      }}>
        <FilePdf size={48} style={{ color: 'var(--ou-text-disabled)', opacity: 0.4 }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 6 }}>
            PDF 열기
          </div>
          <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>
            URL을 입력하거나 파일을 선택하세요
          </div>
        </div>

        {/* URL 입력 */}
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 8 }}>
          <input
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && inputUrl.trim()) open(inputUrl.trim()); }}
            placeholder="https://example.com/document.pdf"
            style={{
              flex: 1, padding: '8px 12px', fontSize: 13,
              background: 'var(--ou-glass)',
              border: '1px solid var(--ou-glass-border)',
              borderRadius: 'var(--ou-radius-sm)',
              color: 'var(--ou-text-body)', outline: 'none',
            }}
            autoFocus
          />
          <button
            onClick={() => inputUrl.trim() && open(inputUrl.trim())}
            style={{
              padding: '8px 14px', fontSize: 13, fontWeight: 600,
              background: 'var(--ou-text-body)', color: 'var(--ou-bg)',
              border: 'none', borderRadius: 'var(--ou-radius-sm)', cursor: 'pointer',
              opacity: inputUrl.trim() ? 1 : 0.4,
            }}
          >
            열기
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>또는</div>

        {/* 파일 업로드 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', fontSize: 13,
            background: 'var(--ou-glass)',
            border: '1px dashed var(--ou-glass-border)',
            borderRadius: 'var(--ou-radius-sm)',
            color: 'var(--ou-text-muted)', cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--ou-glass-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-body)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--ou-glass)';
            (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-muted)';
          }}
        >
          <FilePdf size={16} />
          로컬 PDF 파일 선택
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
    );
  }

  // ── PDF 뷰어 ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* PDF 툴바 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: 'var(--ou-glass-elevated)',
        borderBottom: '1px solid var(--ou-glass-border)',
        backdropFilter: 'var(--ou-blur)',
        flexShrink: 0,
      }}>
        <FilePdf size={14} style={{ color: 'var(--ou-text-disabled)', flexShrink: 0 }} />
        <span style={{
          flex: 1, fontSize: 12, color: 'var(--ou-text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {fileName}
        </span>
        <a
          href={activeUrl}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          title="다운로드"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 4,
            color: 'var(--ou-text-muted)', textDecoration: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-body)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-muted)'; }}
        >
          <Download size={13} />
        </a>
        <button
          onClick={() => setShowInput(true)}
          title="다른 PDF 열기"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 4,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ou-text-muted)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-body)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--ou-text-muted)'; }}
        >
          <ArrowCounterClockwise size={13} />
        </button>
      </div>

      {/* iframe 뷰어 */}
      <iframe
        src={activeUrl}
        style={{ flex: 1, border: 'none', width: '100%', background: '#fff' }}
        title={fileName}
      />
    </div>
  );
}
