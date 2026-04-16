'use client';

import { useState, useEffect } from 'react';

interface DOCXViewerProps {
  url: string;
  /** 서버에서 미리 변환한 HTML (있으면 우선 사용) */
  preRenderedHtml?: string;
}

export function DOCXViewer({ url, preRenderedHtml }: DOCXViewerProps) {
  const [html, setHtml] = useState(preRenderedHtml ?? '');
  const [loading, setLoading] = useState(!preRenderedHtml);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (preRenderedHtml) return;

    (async () => {
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(result.value);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [url, preRenderedHtml]);

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
        <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)' }}>불러오는 중...</span>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div style={{ padding: 24 }}>
        <span style={{ color: 'var(--mantine-color-dimmed)' }}>문서를 표시할 수 없었어요.</span>
      </div>
    );
  }

  return (
    <div
      className="docx-viewer"
      style={{
        padding: 24,
        maxWidth: 700,
        margin: '0 auto',
        lineHeight: 1.7,
        fontSize: 15,
        color: 'var(--mantine-color-text)',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
