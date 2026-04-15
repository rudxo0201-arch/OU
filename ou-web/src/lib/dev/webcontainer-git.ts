/**
 * WebContainer 내부에서 git 명령 실행 유틸리티
 */

import type { WebContainer } from '@webcontainer/api';
import type { GitChange, GitLogEntry } from '@/stores/devWorkspaceStore';

/**
 * 컨테이너에서 명령 실행 후 출력 수집
 * WebContainer의 process.output에는 stdout/stderr가 합쳐져서 나온다.
 */
async function exec(
  container: WebContainer,
  cmd: string,
  args: string[],
): Promise<{ stdout: string; exitCode: number }> {
  const process = await container.spawn(cmd, args);

  let output = '';

  // pipeTo는 stream이 끝날 때까지 대기하므로 별도 promise로
  const outputDone = process.output.pipeTo(
    new WritableStream({
      write(chunk) { output += chunk; },
    }),
  );

  const exitCode = await process.exit;
  // stream flush 대기
  await outputDone.catch(() => {});

  return { stdout: output, exitCode };
}

/** git status --porcelain 파싱 */
export async function wcGitStatus(container: WebContainer): Promise<{
  branch: string;
  changes: GitChange[];
  log: GitLogEntry[];
}> {
  // 브랜치
  const branchResult = await exec(container, 'git', ['branch', '--show-current']);
  const branch = branchResult.stdout.trim() || 'main';

  // 변경 사항
  const statusResult = await exec(container, 'git', ['status', '--porcelain']);
  const changes: GitChange[] = statusResult.stdout
    .split('\n')
    .filter(Boolean)
    .map(line => ({
      staged: line[0] || ' ',
      unstaged: line[1] || ' ',
      path: line.slice(3).trim(),
    }));

  // 로그
  const logResult = await exec(container, 'git', [
    'log', '--oneline', '-20', '--format=%h %s',
  ]);
  const log: GitLogEntry[] = logResult.stdout
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const spaceIdx = line.indexOf(' ');
      return {
        hash: line.slice(0, spaceIdx),
        message: line.slice(spaceIdx + 1),
      };
    });

  return { branch, changes, log };
}

/** git add */
export async function wcGitAdd(container: WebContainer, paths: string[]): Promise<void> {
  await exec(container, 'git', ['add', ...paths]);
}

/** git commit */
export async function wcGitCommit(
  container: WebContainer,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await exec(container, 'git', ['commit', '-m', message]);
  return { success: result.exitCode === 0, error: result.exitCode !== 0 ? result.stdout : undefined };
}

/** git diff */
export async function wcGitDiff(container: WebContainer, paths: string[]): Promise<string> {
  const result = await exec(container, 'git', ['diff', ...paths]);
  return result.stdout;
}
