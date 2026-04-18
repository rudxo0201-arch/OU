import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.env.DEV_PROJECT_ROOT || process.cwd();

// 허용 명령어 접두사
const ALLOWED_PREFIXES = [
  'pnpm', 'npm', 'npx', 'node',
  'git status', 'git log', 'git diff', 'git branch', 'git add', 'git commit',
  'ls', 'cat', 'head', 'tail', 'wc',
  'grep', 'find', 'which',
  'echo', 'pwd',
  'tsc', 'eslint', 'prettier',
];

// 위험 패턴 블로킹
const BLOCKED_PATTERNS = [
  /rm\s+(-rf?|--recursive)/i,
  /sudo/i,
  /chmod\s+777/,
  />\s*\/dev\//,
  /curl.*\|.*sh/,
  /wget.*\|.*sh/,
  /eval\s*\(/,
  /git\s+push/,
  /git\s+reset\s+--hard/,
  /git\s+checkout\s+\./,
];

function isAllowed(command: string): boolean {
  const trimmed = command.trim();
  const allowed = ALLOWED_PREFIXES.some(p => trimmed.startsWith(p));
  const blocked = BLOCKED_PATTERNS.some(p => p.test(trimmed));
  return allowed && !blocked;
}

/**
 * POST /api/dev/exec
 * 명령어 실행 (관리자 전용, 화이트리스트)
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { command } = await req.json() as { command: string };

  if (!command || !isAllowed(command)) {
    return NextResponse.json({
      error: 'Command not allowed',
      hint: `허용: ${ALLOWED_PREFIXES.join(', ')}`,
    }, { status: 400 });
  }

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: PROJECT_ROOT,
      timeout: 60000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    // 실행 결과를 OU 데이터로 기록
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const hasError = !!stderr && !stdout;
        await supabase.from('data_nodes').insert({
          user_id: user.id,
          domain: 'development',
          raw: `$ ${command}\n\n${stdout || stderr}`.slice(0, 5000),
          source_type: 'dev_tool',
          confidence: 'high',
          resolution: 'resolved',
          view_hint: 'terminal',
          visibility: 'private',
          domain_data: {
            title: `$ ${command.slice(0, 50)}`,
            action_type: hasError ? 'debug' : 'general',
            error_type: hasError ? 'CommandError' : undefined,
            date: new Date().toISOString().split('T')[0],
          },
        });
      }
    } catch (e) {
      console.error('[Dev] exec log failed:', e);
    }

    return NextResponse.json({
      stdout,
      stderr,
      exitCode: 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
    });
  }
}
