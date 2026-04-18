/**
 * AI 응답에서 액션 블록을 파싱하고 실행
 *
 * 액션 포맷:
 * ```action:file_edit
 * {"path": "src/foo.ts", "content": "..."}
 * ```
 *
 * ```action:terminal
 * {"command": "pnpm build"}
 * ```
 *
 * ```action:git
 * {"operation": "add", "paths": ["src/foo.ts"]}
 * {"operation": "commit", "message": "fix: 버그 수정"}
 * {"operation": "diff", "paths": ["src/foo.ts"]}
 * {"operation": "create_branch", "branch": "feature/new"}
 * {"operation": "checkout_branch", "branch": "main"}
 * ```
 *
 * 보안: 기존 /api/dev/file, /api/dev/exec, /api/dev/git 호출 → 서버사이드 보안 그대로 유지
 */

import { parse as parseShellArgs } from 'shell-quote';

export interface FileEditAction {
  type: 'file_edit';
  path: string;
  content: string;
}

export interface TerminalAction {
  type: 'terminal';
  command: string;
}

export interface GitAction {
  type: 'git';
  operation: 'add' | 'commit' | 'diff' | 'checkout_branch' | 'create_branch';
  paths?: string[];
  message?: string;
  branch?: string;
}

export type DevAction = FileEditAction | TerminalAction | GitAction;

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

const ACTION_BLOCK_REGEX = /```action:(file_edit|terminal|git)\n([\s\S]*?)```/g;

/**
 * AI 응답 텍스트에서 액션 블록을 파싱
 */
export function parseActions(text: string): DevAction[] {
  const actions: DevAction[] = [];
  let match;

  ACTION_BLOCK_REGEX.lastIndex = 0;
  while ((match = ACTION_BLOCK_REGEX.exec(text)) !== null) {
    const type = match[1] as 'file_edit' | 'terminal' | 'git';
    const rawJson = match[2].trim();

    try {
      const parsed = JSON.parse(rawJson);

      if (type === 'file_edit' && parsed.path && parsed.content !== undefined) {
        actions.push({ type: 'file_edit', path: parsed.path, content: parsed.content });
      } else if (type === 'terminal' && parsed.command) {
        actions.push({ type: 'terminal', command: parsed.command });
      } else if (type === 'git' && parsed.operation) {
        actions.push({
          type: 'git',
          operation: parsed.operation,
          paths: parsed.paths,
          message: parsed.message,
          branch: parsed.branch,
        });
      }
    } catch {
      // JSON 파싱 실패 → 무시
    }
  }

  return actions;
}

/**
 * 텍스트에서 액션 블록을 제거한 순수 텍스트 반환
 */
export function stripActions(text: string): string {
  return text.replace(ACTION_BLOCK_REGEX, '').trim();
}

interface ExecContext {
  isAdminMode: boolean;
  projectId: string | null;
  webcontainerInstance: any;
}

/**
 * 파일 수정 액션 실행 (Admin: 서버 FS, Project: R2 + WebContainer)
 */
export async function executeFileEdit(action: FileEditAction, ctx?: ExecContext): Promise<ActionResult> {
  try {
    const apiUrl = ctx && !ctx.isAdminMode && ctx.projectId
      ? `/api/dev/projects/${ctx.projectId}/files`
      : '/api/dev/file';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: action.path, content: action.content }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Write failed' };

    // WebContainer에도 동기화
    if (ctx?.webcontainerInstance && !ctx.isAdminMode) {
      const { writeContainerFile } = await import('@/lib/dev/webcontainer');
      await writeContainerFile(action.path, action.content);
    }

    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * 터미널 명령 실행 (Admin: 서버 API, Project: WebContainer)
 */
export async function executeTerminal(action: TerminalAction, ctx?: ExecContext): Promise<ActionResult> {
  try {
    if (ctx?.webcontainerInstance && !ctx.isAdminMode) {
      // WebContainer 내부에서 명령 실행
      const container = ctx.webcontainerInstance;
      const parsed = parseShellArgs(action.command).filter((t): t is string => typeof t === 'string');
      const cmd = parsed[0];
      const args = parsed.slice(1);
      if (!cmd) return { success: false, error: 'Empty command' };
      const process = await container.spawn(cmd, args);

      let stdout = '';
      process.output.pipeTo(
        new WritableStream({ write(chunk) { stdout += chunk; } }),
      );
      const exitCode = await process.exit;

      return {
        success: exitCode === 0,
        data: { stdout, exitCode },
        error: exitCode !== 0 ? stdout : undefined,
      };
    }

    const res = await fetch('/api/dev/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: action.command }),
    });
    const data = await res.json();
    if (data.error) return { success: false, error: data.error };
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Git 액션 실행 (Admin: 서버 API, Project: WebContainer git)
 */
export async function executeGit(action: GitAction, ctx?: ExecContext): Promise<ActionResult> {
  try {
    if (ctx?.webcontainerInstance && !ctx.isAdminMode) {
      const { wcGitAdd, wcGitCommit, wcGitDiff } = await import('@/lib/dev/webcontainer-git');
      const container = ctx.webcontainerInstance;

      switch (action.operation) {
        case 'add':
          await wcGitAdd(container, action.paths || ['.']);
          return { success: true };
        case 'commit':
          return await wcGitCommit(container, action.message || '');
        case 'diff': {
          const diff = await wcGitDiff(container, action.paths || []);
          return { success: true, data: { diff } };
        }
        default:
          return { success: false, error: `Unsupported operation: ${action.operation}` };
      }
    }

    const res = await fetch('/api/dev/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: action.operation,
        paths: action.paths,
        message: action.message,
        branch: action.branch,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error || 'Git operation failed' };
    }
    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
