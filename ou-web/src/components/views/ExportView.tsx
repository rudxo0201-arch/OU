'use client';

import { useMemo, useRef } from 'react';
import { DownloadSimple, Printer } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

type ExportFormat = 'md' | 'txt' | 'pdf';

interface ExportViewProps extends ViewProps {
  filters?: Record<string, any> & { format?: ExportFormat };
}

interface ExportEntry {
  id: string;
  date: string;
  title: string;
  content: string;
}

function nodesToEntries(nodes: any[]): ExportEntry[] {
  return nodes
    .map(n => ({
      id: n.id,
      date: n.domain_data?.date ?? n.created_at ?? '',
      title: n.domain_data?.title ?? '',
      content: n.domain_data?.content ?? n.domain_data?.description ?? n.raw ?? '',
    }))
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

function groupByDate(entries: ExportEntry[]): [string, ExportEntry[]][] {
  const map: Record<string, ExportEntry[]> = {};
  for (const entry of entries) {
    const key = entry.date ? dayjs(entry.date).format('YYYY-MM-DD') : '날짜 없음';
    if (!map[key]) map[key] = [];
    map[key].push(entry);
  }
  return Object.entries(map);
}

function generateMarkdown(entries: ExportEntry[]): string {
  const grouped = groupByDate(entries);
  const lines: string[] = [];

  for (const [dateKey, dayEntries] of grouped) {
    const dateLabel =
      dateKey === '날짜 없음' ? dateKey : dayjs(dateKey).format('YYYY년 M월 D일 dddd');
    lines.push(`## ${dateLabel}\n`);

    for (const entry of dayEntries) {
      if (entry.title) {
        lines.push(`### ${entry.title}\n`);
      }
      lines.push(entry.content);
      if (entry.date) {
        lines.push(`\n> ${dayjs(entry.date).format('A h:mm')}`);
      }
      lines.push('');
    }
    lines.push('---\n');
  }

  return lines.join('\n');
}

function generatePlainText(entries: ExportEntry[]): string {
  const grouped = groupByDate(entries);
  const lines: string[] = [];

  for (const [dateKey, dayEntries] of grouped) {
    const dateLabel =
      dateKey === '날짜 없음' ? dateKey : dayjs(dateKey).format('YYYY년 M월 D일 dddd');
    lines.push(`[ ${dateLabel} ]`);
    lines.push('='.repeat(40));

    for (const entry of dayEntries) {
      if (entry.title) {
        lines.push(`\n  ${entry.title}`);
        lines.push(`  ${'-'.repeat(entry.title.length * 2)}`);
      }
      lines.push(`  ${entry.content}`);
      if (entry.date) {
        lines.push(`  (${dayjs(entry.date).format('A h:mm')})`);
      }
      lines.push('');
    }
    lines.push('');
  }

  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportView({ nodes, filters }: ExportViewProps) {
  const format: ExportFormat = (filters?.format as ExportFormat) ?? 'md';
  const previewRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => nodesToEntries(nodes), [nodes]);
  const grouped = useMemo(() => groupByDate(entries), [entries]);

  const previewContent = useMemo(() => {
    if (format === 'md') return generateMarkdown(entries);
    return generatePlainText(entries);
  }, [entries, format]);

  const handleDownload = () => {
    if (format === 'pdf') {
      window.print();
      return;
    }

    const dateStr = dayjs().format('YYYYMMDD');
    const ext = format === 'md' ? 'md' : 'txt';
    const mime = format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
    const content = format === 'md' ? generateMarkdown(entries) : generatePlainText(entries);
    downloadFile(content, `내기록_${dateStr}.${ext}`, mime);
  };

  if (entries.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      {/* Top controls */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)' }}>
          {entries.length}개 기록 | {format === 'md' ? '마크다운' : format === 'txt' ? '텍스트' : '인쇄'}
        </span>
        <button
          onClick={handleDownload}
          style={{
            padding: '6px 12px',
            border: '0.5px solid var(--ou-border, #333)',
            borderRadius: 6,
            background: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {format === 'pdf' ? <Printer size={14} /> : <DownloadSimple size={14} />}
          {format === 'pdf' ? '인쇄하기' : '다운로드'}
        </button>
      </div>

      {/* Preview */}
      {format === 'pdf' ? (
        <div
          ref={previewRef}
          style={{
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {grouped.map(([dateKey, dayEntries], gi) => (
            <div key={dateKey} style={{ marginBottom: 24 }}>
              {gi > 0 && <div style={{ borderTop: '0.5px solid var(--ou-border, #333)', marginBottom: 16 }} />}
              <span style={{ fontSize: 16, fontWeight: 600, display: 'block', marginBottom: 12 }}>
                {dateKey === '날짜 없음'
                  ? dateKey
                  : dayjs(dateKey).format('YYYY년 M월 D일 dddd')}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {dayEntries.map(entry => (
                  <div key={entry.id} style={{ paddingLeft: 16, borderLeft: '2px solid var(--ou-gray-3, #ccc)' }}>
                    {entry.title && (
                      <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{entry.title}</span>
                    )}
                    <p style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {entry.content}
                    </p>
                    {entry.date && (
                      <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginTop: 4 }}>
                        {dayjs(entry.date).format('A h:mm')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <div
            style={{
              padding: 12,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '0.5px solid var(--ou-border, #333)',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {previewContent}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .document-view, .document-view * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}
