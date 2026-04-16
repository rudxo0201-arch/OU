'use client';

import { useMemo, useRef } from 'react';
import { Stack, Text, Box, Group, Button, Divider, ScrollArea } from '@mantine/core';
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
    <Stack gap="md" p="md">
      {/* 상단 컨트롤 */}
      <Group justify="space-between" className="no-print">
        <Text fz="sm" c="dimmed">
          {entries.length}개 기록 | {format === 'md' ? '마크다운' : format === 'txt' ? '텍스트' : '인쇄'}
        </Text>
        <Button
          variant="default"
          size="xs"
          leftSection={format === 'pdf' ? <Printer size={14} /> : <DownloadSimple size={14} />}
          onClick={handleDownload}
          styles={{
            root: {
              border: '0.5px solid var(--mantine-color-default-border)',
              color: 'var(--mantine-color-text)',
            },
          }}
        >
          {format === 'pdf' ? '인쇄하기' : '다운로드'}
        </Button>
      </Group>

      {/* 미리보기 */}
      {format === 'pdf' ? (
        // PDF 모드: 문서 형태 미리보기 (인쇄용)
        <Box
          ref={previewRef}
          style={{
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {grouped.map(([dateKey, dayEntries], gi) => (
            <Box key={dateKey} mb="lg">
              {gi > 0 && <Divider mb="md" color="var(--mantine-color-default-border)" />}
              <Text fz="md" fw={600} mb="sm">
                {dateKey === '날짜 없음'
                  ? dateKey
                  : dayjs(dateKey).format('YYYY년 M월 D일 dddd')}
              </Text>
              <Stack gap="md">
                {dayEntries.map(entry => (
                  <Box key={entry.id} pl="md" style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}>
                    {entry.title && (
                      <Text fz="sm" fw={600} mb={4}>{entry.title}</Text>
                    )}
                    <Text fz="sm" style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {entry.content}
                    </Text>
                    {entry.date && (
                      <Text fz={10} c="dimmed" mt={4}>
                        {dayjs(entry.date).format('A h:mm')}
                      </Text>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      ) : (
        // MD/TXT 모드: 코드 블록 미리보기
        <ScrollArea.Autosize mah={500}>
          <Box
            p="sm"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '0.5px solid var(--mantine-color-default-border)',
              borderRadius: 'var(--mantine-radius-md)',
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              color: 'var(--mantine-color-text)',
            }}
          >
            {previewContent}
          </Box>
        </ScrollArea.Autosize>
      )}

      {/* 인쇄용 스타일 */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .document-view, .document-view * { visibility: visible; }
        }
      `}</style>
    </Stack>
  );
}
