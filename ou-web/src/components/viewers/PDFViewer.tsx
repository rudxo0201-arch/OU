'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
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
    <div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '8px 0', gap: 8 }}>
        <button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(p => p - 1)}
          style={{ background: 'transparent', border: 'none', cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: pageNumber <= 1 ? 0.3 : 1, color: 'inherit' }}
        >
          <CaretLeft size={16} />
        </button>
        <span style={{ fontSize: 'var(--mantine-font-size-sm)' }}>{pageNumber} / {numPages || '?'}</span>
        <button
          disabled={numPages > 0 && pageNumber >= numPages}
          onClick={() => setPageNumber(p => p + 1)}
          style={{ background: 'transparent', border: 'none', cursor: (numPages > 0 && pageNumber >= numPages) ? 'not-allowed' : 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: (numPages > 0 && pageNumber >= numPages) ? 0.3 : 1, color: 'inherit' }}
        >
          <CaretRight size={16} />
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)' }}>불러오는 중...</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
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
      </div>
    </div>
  );
}
