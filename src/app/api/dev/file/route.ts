import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = process.env.DEV_PROJECT_ROOT || process.cwd();

const BLOCKED_FILES = ['.env', '.env.local', '.env.production', 'credentials.json'];

function isSafePath(requestedPath: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  return resolved.startsWith(PROJECT_ROOT);
}

function isBlocked(filePath: string): boolean {
  const basename = path.basename(filePath);
  return BLOCKED_FILES.some(b => basename === b || basename.startsWith('.env'));
}

/**
 * GET /api/dev/file?path=src/app/page.tsx
 * 파일 내용 읽기
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const filePath = req.nextUrl.searchParams.get('path') || '';

  if (!filePath || !isSafePath(filePath) || isBlocked(filePath)) {
    return NextResponse.json({ error: 'Invalid or blocked path' }, { status: 400 });
  }

  const fullPath = path.resolve(PROJECT_ROOT, filePath);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    const stat = await fs.stat(fullPath);

    // 파일 확장자로 언어 감지
    const ext = path.extname(filePath).slice(1);
    const languageMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescriptreact',
      js: 'javascript', jsx: 'javascriptreact',
      json: 'json', md: 'markdown', css: 'css',
      html: 'html', sql: 'sql', sh: 'shell',
      yml: 'yaml', yaml: 'yaml',
    };

    return NextResponse.json({
      content,
      path: filePath,
      language: languageMap[ext] || 'plaintext',
      size: stat.size,
      modified: stat.mtime.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}

/**
 * POST /api/dev/file
 * 파일 쓰기 (편집 저장)
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { path: filePath, content } = await req.json() as {
    path: string;
    content: string;
  };

  if (!filePath || !isSafePath(filePath) || isBlocked(filePath)) {
    return NextResponse.json({ error: 'Invalid or blocked path' }, { status: 400 });
  }

  const fullPath = path.resolve(PROJECT_ROOT, filePath);

  try {
    // 기존 내용 읽기 (변경 기록용)
    let oldContent = '';
    try {
      oldContent = await fs.readFile(fullPath, 'utf-8');
    } catch {
      // 새 파일
    }

    await fs.writeFile(fullPath, content, 'utf-8');

    // 변경을 OU 데이터로 기록 (Layer 2 파이프라인)
    if (oldContent !== content) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { classifyDomain } = await import('@/lib/pipeline/classifier');

          const changeDesc = `파일 수정: ${filePath}`;
          const { domain } = await classifyDomain(changeDesc);
          const domainData = {
            title: changeDesc.slice(0, 50),
            date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()),
            files_changed: [filePath],
            action_type: 'edit',
          };

          await supabase.from('data_nodes').insert({
            user_id: user.id,
            domain: 'development',
            raw: `파일 수정: ${filePath}\n\n변경 내용:\n${content.slice(0, 5000)}`,
            source_type: 'dev_tool',
            confidence: 'high',
            resolution: 'resolved',
            view_hint: 'code',
            visibility: 'private',
            domain_data: domainData,
          });
        }
      } catch (e) {
        console.error('[Dev] data_node insert failed:', e);
      }
    }

    return NextResponse.json({ success: true, path: filePath });
  } catch (e) {
    return NextResponse.json({ error: 'Write failed' }, { status: 500 });
  }
}
