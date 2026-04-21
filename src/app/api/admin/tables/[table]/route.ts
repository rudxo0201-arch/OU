import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { logAdminAction } from '@/lib/auth/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { ALLOWED_TABLES, getTableSchema } from '@/lib/admin/table-schemas';

function forbidden() {
  return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
}

function badTable() {
  return NextResponse.json({ error: '허용되지 않은 테이블입니다.' }, { status: 400 });
}

/** GET — 테이블 데이터 조회 (페이지네이션, 정렬, 검색) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  if (!(await isAdmin())) return forbidden();
  const { table } = await params;
  if (!ALLOWED_TABLES.includes(table)) return badTable();

  const schema = getTableSchema(table);
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') ?? '1');
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20');
  const sortBy = searchParams.get('sortBy') ?? schema?.defaultSort ?? 'created_at';
  const sortAsc = searchParams.get('sortAsc') === 'true';
  const search = searchParams.get('search') ?? '';

  const db = createAdminClient();
  const visibleColumns = schema?.columns.filter(c => !c.hidden).map(c => c.name).join(',') ?? '*';

  let query = db
    .from(table)
    .select(visibleColumns, { count: 'exact' })
    .order(sortBy, { ascending: sortAsc })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // 텍스트 컬럼 검색
  if (search && schema) {
    const textCols = schema.columns.filter(c => c.type === 'text' && !c.hidden);
    if (textCols.length > 0) {
      const orCondition = textCols.map(c => `${c.name}.ilike.%${search}%`).join(',');
      query = query.or(orCondition);
    }
  }

  // 컬럼별 필터 (filter.{column}=value)
  if (schema) {
    for (const [key, value] of Array.from(searchParams.entries())) {
      if (!key.startsWith('filter.')) continue;
      const colName = key.slice('filter.'.length);
      const col = schema.columns.find(c => c.name === colName);
      if (!col || !value) continue;

      if (col.type === 'enum' || col.type === 'text') {
        query = query.eq(colName, value);
      } else if (col.type === 'boolean') {
        query = query.eq(colName, value === 'true');
      } else if (colName.endsWith('_from')) {
        // 날짜 범위: filter.created_at_from=2024-01-01
        const baseCol = colName.slice(0, -'_from'.length);
        query = query.gte(baseCol, value);
      } else if (colName.endsWith('_to')) {
        const baseCol = colName.slice(0, -'_to'.length);
        query = query.lte(baseCol, value + 'T23:59:59');
      }
    }
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0 });
}

/** POST — 행 생성 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  if (!(await isAdmin())) return forbidden();
  const { table } = await params;
  if (!ALLOWED_TABLES.includes(table)) return badTable();

  const body = await request.json();
  const db = createAdminClient();

  const { data, error } = await db.from(table).insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction('db.create', table, data?.id ?? 'new', { table, row: body });
  return NextResponse.json({ data });
}

/** PATCH — 행 수정 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  if (!(await isAdmin())) return forbidden();
  const { table } = await params;
  if (!ALLOWED_TABLES.includes(table)) return badTable();

  const { id, compositeKey, updates } = await request.json();
  const db = createAdminClient();

  let query = db.from(table).update(updates);

  // 복합 키 테이블 처리
  if (compositeKey && typeof compositeKey === 'object') {
    for (const [col, val] of Object.entries(compositeKey)) {
      query = query.eq(col, val as string);
    }
  } else if (id) {
    query = query.eq('id', id);
  } else {
    return NextResponse.json({ error: 'id 또는 compositeKey가 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await query.select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction('db.update', table, id ?? JSON.stringify(compositeKey), { table, updates });
  return NextResponse.json({ data });
}

/** DELETE — 행 삭제 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  if (!(await isAdmin())) return forbidden();
  const { table } = await params;
  if (!ALLOWED_TABLES.includes(table)) return badTable();

  const { id, compositeKey, ids } = await request.json();
  const db = createAdminClient();

  let query = db.from(table).delete();

  if (ids && Array.isArray(ids)) {
    query = query.in('id', ids);
  } else if (compositeKey && typeof compositeKey === 'object') {
    for (const [col, val] of Object.entries(compositeKey)) {
      query = query.eq(col, val as string);
    }
  } else if (id) {
    query = query.eq('id', id);
  } else {
    return NextResponse.json({ error: 'id, ids, 또는 compositeKey가 필요합니다.' }, { status: 400 });
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction('db.delete', table, id ?? JSON.stringify(ids ?? compositeKey), { table });
  return NextResponse.json({ ok: true });
}
