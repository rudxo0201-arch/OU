'use client';

import { useState, useEffect } from 'react';
import { Box, Text, Loader, Table, Tabs, ScrollArea } from '@mantine/core';

interface SheetData {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

interface XLSXViewerProps {
  url: string;
  /** 서버에서 미리 파싱한 시트 데이터 (있으면 우선 사용) */
  preRenderedSheets?: SheetData[];
}

export function XLSXViewer({ url, preRenderedSheets }: XLSXViewerProps) {
  const [sheets, setSheets] = useState<SheetData[]>(preRenderedSheets ?? []);
  const [loading, setLoading] = useState(!preRenderedSheets?.length);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (preRenderedSheets?.length) {
      setActiveTab(preRenderedSheets[0].name);
      return;
    }

    (async () => {
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const parsed: SheetData[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
          if (rows.length === 0) continue;
          const headers = Object.keys(rows[0] ?? {});
          parsed.push({ name: sheetName, headers, rows });
        }

        setSheets(parsed);
        if (parsed.length > 0) setActiveTab(parsed[0].name);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [url, preRenderedSheets]);

  if (loading) {
    return (
      <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader size="sm" color="gray" />
      </Box>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <Box p="xl">
        <Text c="dimmed">스프레드시트를 표시할 수 없었어요.</Text>
      </Box>
    );
  }

  const activeSheet = sheets.find(s => s.name === activeTab) ?? sheets[0];

  return (
    <Box p="md">
      {sheets.length > 1 && (
        <Tabs value={activeTab} onChange={setActiveTab} mb="md">
          <Tabs.List>
            {sheets.map(s => (
              <Tabs.Tab key={s.name} value={s.name}>
                {s.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      )}

      <ScrollArea>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          fz="sm"
        >
          <Table.Thead>
            <Table.Tr>
              {activeSheet.headers.map(h => (
                <Table.Th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {activeSheet.rows.slice(0, 200).map((row, i) => (
              <Table.Tr key={i}>
                {activeSheet.headers.map(h => (
                  <Table.Td key={h}>{String(row[h] ?? '')}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {activeSheet.rows.length > 200 && (
          <Text c="dimmed" fz="sm" ta="center" mt="sm">
            {activeSheet.rows.length - 200}행 더 있어요
          </Text>
        )}
      </ScrollArea>
    </Box>
  );
}
