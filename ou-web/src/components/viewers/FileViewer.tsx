'use client';

import { useState, useEffect } from 'react';
import { Box, Text } from '@mantine/core';
import { PDFViewer } from './PDFViewer';
import { OUFileViewer } from './OUFileViewer';
import { DOCXViewer } from './DOCXViewer';
import { XLSXViewer } from './XLSXViewer';
import { PPTViewer } from './PPTViewer';
import type { OUFile } from '@/lib/ou-format/types';

interface FileViewerProps {
  url: string;
  fileType: string;
  highlightPage?: number;
  /** 서버에서 전달된 추가 데이터 (slides, docx_html, sheets, extracted_text 등) */
  nodeData?: {
    slides?: Array<{ index: number; heading: string; body: string }>;
    docx_html?: string;
    sheets?: Array<{ name: string; headers: string[]; rows: Record<string, unknown>[] }>;
    extracted_text?: string;
  };
}

export function FileViewer({ url, fileType, highlightPage, nodeData }: FileViewerProps) {
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

  // 영상
  if (fileType === 'video') {
    return (
      <Box p="md" style={{ display: 'flex', justifyContent: 'center' }}>
        <video
          src={url}
          controls
          style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }}
        />
      </Box>
    );
  }

  // 음성
  if (fileType === 'audio') {
    return (
      <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <audio src={url} controls style={{ width: '100%', maxWidth: 600 }} />
      </Box>
    );
  }

  // DOCX
  if (fileType === 'docx') {
    return <DOCXViewer url={url} preRenderedHtml={nodeData?.docx_html} />;
  }

  // XLSX
  if (fileType === 'xlsx') {
    return <XLSXViewer url={url} preRenderedSheets={nodeData?.sheets} />;
  }

  // PPT/PPTX
  if (fileType === 'pptx' || fileType === 'ppt') {
    return (
      <PPTViewer
        slides={nodeData?.slides}
        extractedText={nodeData?.extracted_text}
      />
    );
  }

  // HWP/HWPX — 텍스트 기반 렌더링
  if (fileType === 'hwp' || fileType === 'hwpx') {
    if (nodeData?.extracted_text) {
      return (
        <Box p="xl" maw={700} mx="auto">
          <Text fz="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {nodeData.extracted_text}
          </Text>
        </Box>
      );
    }
    return (
      <Box p="xl">
        <Text c="dimmed">문서 내용을 표시할 수 없었어요.</Text>
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
