/**
 * 개발 전용 시스템 프롬프트 빌더
 *
 * 범용 OU 프롬프트(데이터 수집 어시스턴트)와 완전히 분리.
 * 열린 파일, 터미널 에러, Git 상태, 과거 개발 이력을 맥락으로 주입.
 * 프로젝트 모드 시 프로젝트별 기술 스택을 동적으로 반영.
 */

export interface DevContext {
  activeFilePath?: string | null;
  activeFileContent?: string | null;
  recentTerminalOutput?: Array<{
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
  currentErrors?: string[];
  selectedText?: string;
  ragResults?: string[];
  // Git 맥락
  gitBranch?: string;
  gitChanges?: Array<{ staged: string; unstaged: string; path: string }>;
  gitLog?: Array<{ hash: string; message: string }>;
  // 프로젝트 맥락
  projectName?: string;
  projectDescription?: string;
  projectTechStack?: string[];
}

function buildBasePrompt(context: DevContext): string {
  const isProjectMode = !!context.projectName;
  const techStackLine = context.projectTechStack?.length
    ? context.projectTechStack.join(', ')
    : 'Next.js 14 (App Router), TypeScript, Mantine v7, Phosphor Icons, Zustand, PixiJS, Supabase (Auth + PostgreSQL), Cloudflare R2, Claude/OpenAI LLM';

  const roleDesc = isProjectMode
    ? `당신은 "${context.projectName}" 프로젝트의 개발 어시스턴트입니다.`
    : '당신은 개발 어시스턴트입니다.';

  return `${roleDesc}

## 역할
코드를 이해하고, 에러를 분석하고, 구현 방법을 제안합니다.
사용자가 작업 중인 파일과 터미널 상태를 실시간으로 알고 있습니다.

## 기술 스택
${techStackLine}

## 응답 규칙
- 코드를 포함할 때는 파일 경로와 함께 코드 블록으로
- 수정이 필요하면 변경할 부분만 명확히
- 에러 분석 시 원인 → 해결책 순서로
- 불필요한 설명 없이 간결하게
- 한국어로 답변

## 액션 블록 (선택적)
사용자가 파일 수정, 명령 실행, 또는 Git 작업을 요청하면, 일반 설명과 함께 아래 포맷으로 액션 블록을 포함할 수 있습니다.
사용자가 명시적으로 요청하지 않으면 액션 블록을 포함하지 마세요.

파일 수정:
\`\`\`action:file_edit
{"path": "상대경로", "content": "전체 파일 내용"}
\`\`\`

터미널 명령:
\`\`\`action:terminal
{"command": "실행할 명령어"}
\`\`\`

Git 작업:
\`\`\`action:git
{"operation": "add", "paths": ["src/foo.ts", "src/bar.ts"]}
\`\`\`
\`\`\`action:git
{"operation": "commit", "message": "fix: 버그 수정"}
\`\`\`
\`\`\`action:git
{"operation": "diff", "paths": ["src/foo.ts"]}
\`\`\`
\`\`\`action:git
{"operation": "create_branch", "branch": "feature/new"}
\`\`\`
\`\`\`action:git
{"operation": "checkout_branch", "branch": "main"}
\`\`\`

Git 작업 시 주의:
- commit 전에 반드시 add를 먼저 제안하세요
- 커밋 메시지는 변경 내용을 명확히 설명하세요
- 브랜치 이름은 영문 소문자, 하이픈, 슬래시만 사용
- push는 지원하지 않습니다 (보안 제한)

액션 블록은 반드시 위 JSON 포맷을 따르세요.`;
}

export function buildDevSystemPrompt(context: DevContext): string {
  const parts: string[] = [buildBasePrompt(context)];

  // Git 상태
  if (context.gitBranch) {
    let gitSection = `\n## Git 상태\n브랜치: \`${context.gitBranch}\``;

    if (context.gitChanges && context.gitChanges.length > 0) {
      const changedFiles = context.gitChanges.slice(0, 20).map(c => {
        const status = c.staged === '?' ? '??' : `${c.staged}${c.unstaged}`;
        return `  ${status} ${c.path}`;
      }).join('\n');
      gitSection += `\n변경 파일 (${context.gitChanges.length}개):\n\`\`\`\n${changedFiles}\n\`\`\``;
    }

    if (context.gitLog && context.gitLog.length > 0) {
      const recentLog = context.gitLog.slice(0, 5).map(l => `  ${l.hash} ${l.message}`).join('\n');
      gitSection += `\n최근 커밋:\n\`\`\`\n${recentLog}\n\`\`\``;
    }

    parts.push(gitSection);
  }

  // 현재 열린 파일
  if (context.activeFilePath) {
    parts.push(`\n## 현재 열린 파일\n\`${context.activeFilePath}\``);
    if (context.activeFileContent) {
      const truncated = context.activeFileContent.slice(0, 8000);
      parts.push(`\n\`\`\`\n${truncated}\n\`\`\``);
    }
  }

  // 선택된 텍스트
  if (context.selectedText) {
    parts.push(`\n## 선택된 코드\n\`\`\`\n${context.selectedText.slice(0, 2000)}\n\`\`\``);
  }

  // 최근 터미널 출력
  if (context.recentTerminalOutput && context.recentTerminalOutput.length > 0) {
    const recent = context.recentTerminalOutput.slice(-5);
    const terminalStr = recent.map(t => {
      let s = `$ ${t.command}`;
      if (t.stdout) s += `\n${t.stdout.slice(0, 1000)}`;
      if (t.stderr) s += `\nSTDERR: ${t.stderr.slice(0, 1000)}`;
      return s;
    }).join('\n\n');
    parts.push(`\n## 최근 터미널\n\`\`\`\n${terminalStr}\n\`\`\``);
  }

  // 현재 에러
  if (context.currentErrors && context.currentErrors.length > 0) {
    parts.push(`\n## 현재 에러\n${context.currentErrors.map(e => `- ${e.slice(0, 500)}`).join('\n')}`);
  }

  // 과거 개발 관련 DataNode (RAG)
  if (context.ragResults && context.ragResults.length > 0) {
    parts.push(`\n## 관련 개발 이력\n${context.ragResults.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
  }

  return parts.join('\n');
}
