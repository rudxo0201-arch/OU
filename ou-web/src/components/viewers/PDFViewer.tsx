'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Group, ActionIcon, Text, Box, Loader, Center } from '@mantine/core';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  highlightPage?: number;
}

export function PDFViewer({ url, highlightPage }: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(highlightPage ?? 1);
  const [loading, setLoading] = useState(true);

  return (
    <Box>
      <Group justify="center" py="sm">
        <ActionIcon
          variant="subtle"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(p => p - 1)}
        >
          <CaretLeft size={16} />
        </ActionIcon>
        <Text fz="sm">{pageNumber} / {numPages || '?'}</Text>
        <ActionIcon
          variant="subtle"
          disabled={numPages > 0 && pageNumber >= numPages}
          onClick={() => setPageNumber(p => p + 1)}
        >
          <CaretRight size={16} />
        </ActionIcon>
      </Group>

      {loading && (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      )}

      <Box style={{ display: 'flex', justifyContent: 'center' }}>
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            setLoading(false);
          }}
          onLoadError={() => setLoading(false)}
        >
          <Page
            pageNumber={pageNumber}
            width={Math.min(typeof window !== 'undefined' ? window.innerWidth - 48 : 800, 800)}
            renderTextLayer
            renderAnnotationLayer
          />
        </Document>
      </Box>
    </Box>
  );
}
