'use client';

import { useState, useEffect } from 'react';

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
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
        <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)' }}>불러오는 중...</span>
      </div>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <span style={{ color: 'var(--mantine-color-dimmed)' }}>스프레드시트를 표시할 수 없었어요.</span>
      </div>
    );
  }

  const activeSheet = sheets.find(s => s.name === activeTab) ?? sheets[0];

  return (
    <div style={{ padding: 16 }}>
      {sheets.length > 1 && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          {sheets.map(s => (
            <button
              key={s.name}
              onClick={() => setActiveTab(s.name)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: activeTab === s.name ? '2px solid var(--mantine-color-gray-4)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: activeTab === s.name ? 600 : 400,
                color: 'inherit',
                fontSize: 'var(--mantine-font-size-sm)',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--mantine-font-size-sm)' }}>
          <thead>
            <tr>
              {activeSheet.headers.map(h => (
                <th key={h} style={{ whiteSpace: 'nowrap', padding: '8px 12px', borderBottom: '1px solid var(--mantine-color-default-border)', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSheet.rows.slice(0, 200).map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                {activeSheet.headers.map(h => (
                  <td key={h} style={{ padding: '6px 12px', borderBottom: '0.5px solid var(--mantine-color-default-border)' }}>{String(row[h] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {activeSheet.rows.length > 200 && (
          <span style={{ color: 'var(--mantine-color-dimmed)', fontSize: 'var(--mantine-font-size-sm)', display: 'block', textAlign: 'center', marginTop: 8 }}>
            {activeSheet.rows.length - 200}행 더 있어요
          </span>
        )}
      </div>
    </div>
  );
}
