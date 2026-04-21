import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { ALLOWED_TABLES } from '@/lib/admin/table-schemas';

interface ResolveRequest {
  column: string;
  table: string;
  display: string;
  ids: string[];
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { requests }: { requests: ResolveRequest[] } = await request.json();
  if (!Array.isArray(requests)) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const db = createAdminClient();
  const results: { column: string; map: Record<string, string> }[] = [];

  await Promise.all(
    requests.map(async ({ column, table, display, ids }) => {
      if (!ALLOWED_TABLES.includes(table)) return;
      if (ids.length === 0) return;

      const { data, error } = await db
        .from(table)
        .select('id, display_name, name, handle, email, title, subject')
        .in('id', ids.slice(0, 100)) as { data: Record<string, unknown>[] | null; error: unknown };

      if (error || !data) return;

      const map: Record<string, string> = {};
      data.forEach((row: Record<string, unknown>) => {
        if (row.id && row[display]) {
          map[String(row.id)] = String(row[display]);
        }
      });
      results.push({ column, map });
    })
  );

  return NextResponse.json(results);
}
