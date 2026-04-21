import type { TableSchema } from '@/types/admin';

export type FkMap = Map<string, Map<string, string>>;
// column -> uuid -> displayName

/**
 * 주어진 rows에서 FK UUID 목록을 수집하고, /api/admin/tables/resolve-fks로 배치 조회
 */
export async function resolveForeignKeys(
  rows: Record<string, unknown>[],
  schema: TableSchema
): Promise<FkMap> {
  const result: FkMap = new Map();
  if (rows.length === 0) return result;

  // FK 컬럼 파악 (fkTable + fkDisplay 있는 것만)
  const fkCols = schema.columns.filter(c => c.fkTable && c.fkDisplay);
  if (fkCols.length === 0) return result;

  // 컬럼별 고유 UUID 수집
  const requests: { column: string; table: string; display: string; ids: string[] }[] = [];
  fkCols.forEach(col => {
    const ids = Array.from(new Set(
      rows
        .map(r => r[col.name])
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
    ));
    if (ids.length > 0) {
      requests.push({
        column: col.name,
        table: col.fkTable!,
        display: col.fkDisplay!,
        ids,
      });
    }
  });

  if (requests.length === 0) return result;

  try {
    const res = await fetch('/api/admin/tables/resolve-fks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });
    if (!res.ok) return result;

    const data: { column: string; map: Record<string, string> }[] = await res.json();
    data.forEach(({ column, map }) => {
      result.set(column, new Map(Object.entries(map)));
    });
  } catch {
    // FK 해석 실패는 무시 (없으면 UUID 그대로 표시)
  }

  return result;
}
