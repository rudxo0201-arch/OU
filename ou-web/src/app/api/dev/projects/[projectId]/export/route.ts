import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getObjectText, listObjectsR2, buildProjectR2Prefix } from '@/lib/storage/r2';

type RouteContext = { params: Promise<{ projectId: string }> };

const MAX_FILES = 500;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * GET /api/dev/projects/:projectId/export
 * 프로젝트의 모든 파일을 flat map으로 반환 (WebContainer mount용)
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await ctx.params;

  // 소유권 검증
  const { data } = await supabase
    .from('data_nodes')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .eq('domain', 'development')
    .eq('source_type', 'dev_project')
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const prefix = buildProjectR2Prefix(user.id, projectId);

  // 전체 파일 목록 (delimiter 없이 flat)
  const { files } = await listObjectsR2(prefix);
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files (${files.length}/${MAX_FILES})` }, { status: 413 });
  }

  const result: Record<string, string> = {};
  let totalSize = 0;

  for (const file of files) {
    const relativePath = file.key.slice(prefix.length);
    if (!relativePath) continue;

    const content = await getObjectText(file.key);
    if (content === null) continue;

    totalSize += content.length;
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: 'Project too large' }, { status: 413 });
    }

    result[relativePath] = content;
  }

  return NextResponse.json({ files: result, count: Object.keys(result).length });
}
