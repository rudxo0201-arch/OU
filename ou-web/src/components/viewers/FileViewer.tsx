'use client';

import { useState, useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import { PDFViewer } from './PDFViewer';
import { OUFileViewer } from './OUFileViewer';
import type { OUFile } from '@/lib/ou-format/types';

interface FileViewerProps {
  url: string;
  fileType: string;
  highlightPage?: number;
}

export function FileViewer({ url, fileType, highlightPage }: FileViewerProps) {
  if (fileType === 'pdf') {
    return <PDFViewer url={url} highlightPage={highlightPage} />;
  }

  if (fileType === 'ou') {
    return <OUFileViewerLoader url={url} />;
  }

  if (fileType === 'image') {
    return (
      <Box p="md" style={{ display: 'flex', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="업로드 이미지" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
      </Box>
    );
  }

  if (fileType === 'text' || fileType === 'md') {
    return (
      <iframe
        src={url}
        style={{ width: '100%', height: 600, border: 'none' }}
        title="파일 내용"
      />
    );
  }

  return (
    <Box p="xl">
      <Text c="dimmed">이 파일 형식은 아직 내장 뷰어를 지원하지 않아요.</Text>
    </Box>
  );
}

/** .ou 파일을 URL에서 fetch 후 OUFileViewer로 표시 */
function OUFileViewerLoader({ url }: { url: string }) {
  const [ouFile, setOuFile] = useState<OUFile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then((data: OUFile) => setOuFile(data))
      .catch(() => setError(true));
  }, [url]);

  if (error) {
    return (
      <Box p="xl">
        <Text c="dimmed">.ou 파일을 읽지 못했어요.</Text>
      </Box>
    );
  }

  if (!ouFile) {
    return (
      <Box p="xl">
        <Text c="dimmed">불러오는 중...</Text>
      </Box>
    );
  }

  return (
    <Box p="md" maw={600} mx="auto">
      <OUFileViewer file={ouFile} />
    </Box>
  );
}
