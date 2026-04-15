import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.env.DEV_PROJECT_ROOT || process.cwd();

const GIT_OPTS = {
  cwd: PROJECT_ROOT,
  timeout: 30000,
  maxBuffer: 1024 * 1024,
  env: { ...process.env, FORCE_COLOR: '0', GIT_TERMINAL_PROMPT: '0' },
};

/**
 * GET /api/dev/git
 * Git 상태 조회 (branch, status, log)
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    const [branchResult, statusResult, logResult] = await Promise.all([
      execAsync('git branch --show-current', GIT_OPTS),
      execAsync('git status --porcelain', GIT_OPTS),
      execAsync('git log --oneline -10', GIT_OPTS),
    ]);

    const branch = branchResult.stdout.trim();

    // porcelain 파싱: "XY path" → {status, path}
    const changes = statusResult.stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const staged = line[0];
        const unstaged = line[1];
        const filePath = line.slice(3);
        return { staged, unstaged, path: filePath };
      });

    const log = logResult.stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const hash = line.slice(0, 7);
        const message = line.slice(8);
        return { hash, message };
      });

    return NextResponse.json({ branch, changes, log });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      branch: 'unknown',
      changes: [],
      log: [],
    });
  }
}

type GitOperation = 'add' | 'commit' | 'diff' | 'checkout_branch' | 'create_branch';

interface GitRequestBody {
  operation: GitOperation;
  paths?: string[];
  message?: string;
  branch?: string;
}

// 경로 안전 검사: 상위 디렉토리 탈출 방지
function isSafePath(p: string): boolean {
  return !p.includes('..') && !p.startsWith('/');
}

/**
 * POST /api/dev/git
 * Git 쓰기 오퍼레이션 (add, commit, diff, branch)
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = (await req.json()) as GitRequestBody;
  const { operation } = body;

  try {
    switch (operation) {
      case 'add': {
        const paths = body.paths || ['.'];
        if (!paths.every(isSafePath)) {
          return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }
        const escaped = paths.map(p => `"${p}"`).join(' ');
        const { stdout } = await execAsync(`git add ${escaped}`, GIT_OPTS);
        return NextResponse.json({ success: true, output: stdout });
      }

      case 'commit': {
        const message = body.message?.trim();
        if (!message) {
          return NextResponse.json({ error: 'Commit message required' }, { status: 400 });
        }
        // 안전한 메시지 전달: 환경변수로
        const { stdout } = await execAsync(
          'git commit -m "$GIT_COMMIT_MSG"',
          {
            ...GIT_OPTS,
            env: { ...GIT_OPTS.env, GIT_COMMIT_MSG: message },
          }
        );

        // 커밋 로그를 OU 데이터로 기록
        logGitAction('commit', message);

        return NextResponse.json({ success: true, output: stdout });
      }

      case 'diff': {
        const paths = body.paths || [];
        const pathArg = paths.length > 0
          ? paths.filter(isSafePath).map(p => `"${p}"`).join(' ')
          : '';
        const { stdout } = await execAsync(`git diff ${pathArg}`, GIT_OPTS);
        return NextResponse.json({ success: true, diff: stdout });
      }

      case 'checkout_branch': {
        const branch = body.branch?.trim();
        if (!branch || /[;&|`$]/.test(branch)) {
          return NextResponse.json({ error: 'Invalid branch name' }, { status: 400 });
        }
        const { stdout } = await execAsync(`git checkout "${branch}"`, GIT_OPTS);
        return NextResponse.json({ success: true, output: stdout });
      }

      case 'create_branch': {
        const branch = body.branch?.trim();
        if (!branch || /[;&|`$]/.test(branch)) {
          return NextResponse.json({ error: 'Invalid branch name' }, { status: 400 });
        }
        const { stdout } = await execAsync(`git checkout -b "${branch}"`, GIT_OPTS);
        return NextResponse.json({ success: true, output: stdout });
      }

      default:
        return NextResponse.json({ error: `Unknown operation: ${operation}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({
      error: error.stderr || error.message,
      exitCode: error.code || 1,
    }, { status: 500 });
  }
}

/** 커밋 등 주요 Git 액션을 OU data_nodes에 기록 */
async function logGitAction(action: string, detail: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('data_nodes').insert({
      user_id: user.id,
      domain: 'development',
      raw: `git ${action}: ${detail}`.slice(0, 5000),
      source_type: 'dev_tool',
      confidence: 'high',
      resolution: 'resolved',
      view_hint: 'terminal',
      visibility: 'private',
      domain_data: {
        title: `git ${action}: ${detail.slice(0, 80)}`,
        action_type: 'git',
        git_operation: action,
        date: new Date().toISOString().split('T')[0],
      },
    });
  } catch (e) {
    console.error('[Dev] git log failed:', e);
  }
}
