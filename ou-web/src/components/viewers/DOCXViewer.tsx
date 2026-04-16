'use client';

import { useState, useEffect } from 'react';
import { Box, Text, Loader } from '@mantine/core';

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
      <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader size="sm" color="gray" />
      </Box>
    );
  }

  if (error || !html) {
    return (
      <Box p="xl">
        <Text c="dimmed">문서를 표시할 수 없었어요.</Text>
      </Box>
    );
  }

  return (
    <Box
      p="xl"
      maw={700}
      mx="auto"
      className="docx-viewer"
      style={{
        lineHeight: 1.7,
        fontSize: 15,
        color: 'var(--mantine-color-text)',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
