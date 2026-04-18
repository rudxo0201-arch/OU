/**
 * XLSX 파서
 * SheetJS로 엑셀 시트별 텍스트 추출
 */

export interface XLSXParseResult {
  sections: Array<{
    heading: string;
    body: string;
  }>;
  /** 시트별 JSON 데이터 (뷰어용) */
  sheets?: Array<{
    name: string;
    headers: string[];
    rows: Record<string, unknown>[];
  }>;
}

export async function parseXLSX(
  buffer: Buffer,
  _filename: string
): Promise<XLSXParseResult> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sections: XLSXParseResult['sections'] = [];
    const sheets: NonNullable<XLSXParseResult['sheets']> = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      if (rows.length === 0) continue;

      // 헤더 추출
      const headers = Object.keys(rows[0] ?? {});

      // 뷰어용 시트 데이터
      sheets.push({ name: sheetName, headers, rows });

      // 텍스트 변환 (구조화용)
      const lines: string[] = [];
      for (const row of rows.slice(0, 100)) { // 최대 100행
        const vals = headers.map(h => `${h}: ${row[h] ?? ''}`);
        lines.push(vals.join(' | '));
      }

      if (rows.length > 100) {
        lines.push(`... 외 ${rows.length - 100}행`);
      }

      sections.push({
        heading: sheetName,
        body: lines.join('\n'),
      });
    }

    if (sections.length === 0) {
      return {
        sections: [{
          heading: '스프레드시트',
          body: '데이터를 추출할 수 없었어요.',
        }],
      };
    }

    return { sections, sheets };
  } catch (e) {
    console.error('[XLSX Parser] failed:', e);
    return {
      sections: [{
        heading: '파싱 실패',
        body: 'XLSX 파일을 읽을 수 없었어요.',
      }],
    };
  }
}
