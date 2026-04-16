'use client';

import { useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface Slide {
  index: number;
  heading: string;
  body: string;
}

interface PPTViewerProps {
  slides?: Slide[];
  extractedText?: string;
}

export function PPTViewer({ slides, extractedText }: PPTViewerProps) {
  const [current, setCurrent] = useState(0);

  // slides 데이터가 있으면 슬라이드 뷰
  if (slides && slides.length > 0) {
    const slide = slides[current];
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{
            fontSize: 11,
            padding: '2px 8px',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--mantine-color-dimmed)',
          }}>
            슬라이드 {current + 1} / {slides.length}
          </span>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
            <button
              disabled={current === 0}
              onClick={() => setCurrent(c => c - 1)}
              style={{ background: 'transparent', border: 'none', cursor: current === 0 ? 'not-allowed' : 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: current === 0 ? 0.3 : 1, color: 'inherit' }}
            >
              <CaretLeft size={16} />
            </button>
            <button
              disabled={current === slides.length - 1}
              onClick={() => setCurrent(c => c + 1)}
              style={{ background: 'transparent', border: 'none', cursor: current === slides.length - 1 ? 'not-allowed' : 'pointer', padding: 4, display: 'flex', alignItems: 'center', opacity: current === slides.length - 1 ? 0.3 : 1, color: 'inherit' }}
            >
              <CaretRight size={16} />
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 24,
            borderRadius: 'var(--mantine-radius-md)',
            border: '0.5px solid var(--mantine-color-default-border)',
            minHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {slide.heading && (
              <span style={{ fontWeight: 600, fontSize: 'var(--mantine-font-size-lg)' }}>{slide.heading}</span>
            )}
            <span
              style={{ fontSize: 'var(--mantine-font-size-sm)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            >
              {slide.body}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // slides가 없으면 텍스트 폴백
  if (extractedText) {
    return (
      <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
        <span style={{ fontSize: 'var(--mantine-font-size-sm)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
          {extractedText}
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <span style={{ color: 'var(--mantine-color-dimmed)' }}>슬라이드 내용을 표시할 수 없었어요.</span>
    </div>
  );
}
