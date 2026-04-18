import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  uploadTextToR2,
  getObjectText,
  listObjectsR2,
  buildProjectR2Prefix,
} from '@/lib/storage/r2';

type RouteContext = { params: Promise<{ projectId: string }> };

/** 프로젝트 소유권 검증 */
async function verifyOwner(projectId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('data_nodes')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .eq('domain', 'development')
    .eq('source_type', 'dev_project')
    .single();
  return !!data;
}

/** 경로 안전 검증 */
function isSafePath(p: string): boolean {
  return !!p && !p.includes('..') && !p.startsWith('/') && !p.startsWith('\\');
}

/** 파일 확장자 → 언어 */
const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescriptreact',
  js: 'javascript', jsx: 'javascriptreact',
  json: 'json', md: 'markdown', css: 'css',
  html: 'html', sql: 'sql', sh: 'shell',
  yml: 'yaml', yaml: 'yaml', py: 'python',
  go: 'go', rs: 'rust', java: 'java',
};

/**
 * GET /api/dev/projects/:projectId/files?path=src/&mode=list|content
 *
 * mode=list (기본): 디렉토리 목록
 * mode=content&path=src/App.tsx: 파일 내용 읽기
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await ctx.params;
  if (!(await verifyOwner(projectId, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const mode = req.nextUrl.searchParams.get('mode') || 'list';
  const filePath = req.nextUrl.searchParams.get('path') || '';
  const prefix = buildProjectR2Prefix(user.id, projectId);

  if (mode === 'content') {
    // 단일 파일 읽기
    if (!filePath || !isSafePath(filePath)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const content = await getObjectText(prefix + filePath);
    if (content === null) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const ext = filePath.split('.').pop() || '';
    return NextResponse.json({
      content,
      path: filePath,
      language: LANG_MAP[ext] || 'plaintext',
    });
  }

  // 디렉토리 목록
  const dirPrefix = filePath ? prefix + filePath + (filePath.endsWith('/') ? '' : '/') : prefix;
  const { files, directories } = await listObjectsR2(dirPrefix, '/');

  const items: Array<{ name: string; type: 'file' | 'directory'; path: string }> = [];

  // 디렉토리
  for (const dir of directories) {
    const relative = dir.slice(prefix.length);
    const name = relative.replace(/\/$/, '').split('/').pop() || '';
    if (name) {
      items.push({ name, type: 'directory', path: relative.replace(/\/$/, '') });
    }
  }

  // 파일
  for (const file of files) {
    const relative = file.key.slice(prefix.length);
    const name = relative.split('/').pop() || '';
    if (name) {
      items.push({ name, type: 'file', path: relative });
    }
  }

  // 정렬: 디렉토리 먼저, 알파벳순
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ items, path: filePath || '' });
}

/**
 * POST /api/dev/projects/:projectId/files
 * 파일 저장 (생성 또는 수정)
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { projectId } = await ctx.params;
  if (!(await verifyOwner(projectId, user.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { path: filePath, content } = await req.json() as {
    path: string;
    content: string;
  };

  if (!filePath || !isSafePath(filePath)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'Content must be string' }, { status: 400 });
  }

  const prefix = buildProjectR2Prefix(user.id, projectId);
  await uploadTextToR2(prefix + filePath, content);

  // 편집 로그를 DataNode로 기록
  try {
    await supabase.from('data_nodes').insert({
      user_id: user.id,
      domain: 'development',
      raw: `파일 수정: ${filePath}`,
      source_type: 'dev_tool',
      confidence: 'high',
      resolution: 'resolved',
      view_hint: 'code',
      visibility: 'private',
      domain_data: {
        title: `파일 수정: ${filePath}`,
        action_type: 'edit',
        files_changed: [filePath],
        project_id: projectId,
        date: new Date().toISOString().split('T')[0],
      },
    });
  } catch (e) {
    console.error('[Project] edit log failed:', e);
  }

  return NextResponse.json({ success: true, path: filePath });
}
