import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.env.DEV_PROJECT_ROOT || process.cwd();

/**
 * GET /api/dev/search?q=className&glob=*.tsx
 * 코드 검색 (grep)
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const query = req.nextUrl.searchParams.get('q') || '';
  const glob = req.nextUrl.searchParams.get('glob') || '';

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query too short (min 2 chars)' }, { status: 400 });
  }

  // 셸 인젝션 방지
  const safeQuery = query.replace(/[`$(){}|;&<>\\]/g, '');
  const safeGlob = glob.replace(/[`$(){}|;&<>\\]/g, '');

  try {
    const globArg = safeGlob ? `--glob '${safeGlob}'` : '';
    const { stdout } = await execAsync(
      `rg --json -m 50 ${globArg} -- '${safeQuery}' . 2>/dev/null || true`,
      { cwd: PROJECT_ROOT, timeout: 10000, maxBuffer: 1024 * 1024 },
    );

    const results: Array<{ path: string; line: number; text: string }> = [];
    for (const line of stdout.split('\n').filter(Boolean)) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'match') {
          results.push({
            path: parsed.data.path.text.replace(/^\.\//, ''),
            line: parsed.data.line_number,
            text: parsed.data.lines.text.trim().slice(0, 200),
          });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ results, query, total: results.length });
  } catch {
    return NextResponse.json({ results: [], query, total: 0 });
  }
}
