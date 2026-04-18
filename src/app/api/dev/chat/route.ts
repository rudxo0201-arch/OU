import { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { chatWithFallback } from '@/lib/llm/router';
import { buildDevSystemPrompt } from '@/lib/llm/dev-prompts';
import type { DevContext } from '@/lib/llm/dev-prompts';
import type { LLMMessage } from '@/lib/llm/types';
import { searchUserData } from '@/lib/search/inline';
import { ingestConversation } from '@/lib/pipeline/ingest-conversation';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = process.env.DEV_PROJECT_ROOT || process.cwd();

/**
 * POST /api/dev/chat
 * 개발 전용 AI 채팅 — 파일/터미널/에러 맥락을 아는 AI
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    messages: Array<{ role: string; content: string }>;
    context?: {
      activeFilePath?: string | null;
      recentTerminalOutput?: Array<{
        command: string;
        stdout: string;
        stderr: string;
        exitCode: number;
      }>;
      currentErrors?: string[];
      selectedText?: string;
      gitBranch?: string;
      gitChanges?: Array<{ staged: string; unstaged: string; path: string }>;
      gitLog?: Array<{ hash: string; message: string }>;
      // 프로젝트 모드
      projectId?: string;
      projectName?: string;
    };
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, context } = body;
  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isProjectMode = !!context?.projectId;

  // 프로젝트 모드가 아니면 admin만 사용 가능
  if (!isProjectMode && !(await isAdmin())) {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 프로젝트 모드면 소유권 검증
  if (isProjectMode) {
    const { data: project } = await supabase
      .from('data_nodes')
      .select('id, domain_data')
      .eq('id', context!.projectId!)
      .eq('user_id', user.id)
      .eq('source_type', 'dev_project')
      .single();
    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    // 열린 파일 내용 읽기
    let activeFileContent: string | null = null;
    if (context?.activeFilePath) {
      if (isProjectMode) {
        // R2 모드: 프로젝트 파일에서 읽기
        try {
          const { getObjectText, buildProjectR2Prefix } = await import('@/lib/storage/r2');
          const prefix = buildProjectR2Prefix(user.id, context.projectId!);
          activeFileContent = await getObjectText(prefix + context.activeFilePath);
        } catch { /* 파일 없으면 무시 */ }
      } else {
        // Admin 모드: 서버 FS에서 읽기
        try {
          const fullPath = path.resolve(PROJECT_ROOT, context.activeFilePath);
          if (fullPath.startsWith(PROJECT_ROOT)) {
            activeFileContent = await fs.readFile(fullPath, 'utf-8');
          }
        } catch { /* 파일 없으면 무시 */ }
      }
    }

    // 과거 개발 DataNode RAG 검색
    const lastUserMessage = messages[messages.length - 1]?.content ?? '';
    let ragResults: string[] = [];
    try {
      const devNodes = await searchUserData(supabase, user.id, lastUserMessage, 5, true);
      ragResults = devNodes
        .filter(n => n.domain === 'development')
        .map(n => {
          const date = new Date(n.created_at).toLocaleDateString('ko-KR');
          return `[${date}] ${n.raw?.slice(0, 300)}`;
        });
    } catch { /* RAG 실패해도 계속 진행 */ }

    // 프로젝트 메타데이터 (프로젝트 모드)
    let projectName: string | undefined;
    let projectTechStack: string[] | undefined;
    if (isProjectMode) {
      const { data: proj } = await supabase
        .from('data_nodes')
        .select('domain_data')
        .eq('id', context!.projectId!)
        .single();
      if (proj?.domain_data) {
        projectName = proj.domain_data.project_name;
        projectTechStack = proj.domain_data.tech_stack;
      }
    }

    // 시스템 프롬프트 구성
    const devContext: DevContext = {
      activeFilePath: context?.activeFilePath,
      activeFileContent,
      recentTerminalOutput: context?.recentTerminalOutput,
      currentErrors: context?.currentErrors,
      selectedText: context?.selectedText,
      ragResults,
      gitBranch: context?.gitBranch,
      gitChanges: context?.gitChanges,
      gitLog: context?.gitLog,
      projectName,
      projectTechStack,
    };
    const systemPrompt = buildDevSystemPrompt(devContext);

    const recentMessages = messages.slice(-20) as LLMMessage[];
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await chatWithFallback({
            messages: recentMessages,
            systemPrompt,
            userPlan: 'pro',
            userId: user.id,
            onChunk: (text) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            },
            onComplete: async (fullText, provider) => {
              // 대화를 DataNode로 기록 (비동기)
              try {
                const adminSupabase = createAdminClient();
                await ingestConversation({
                  userId: user.id,
                  messages: [
                    { role: 'user', content: lastUserMessage },
                    { role: 'assistant', content: fullText },
                  ],
                  metadata: {
                    source: 'dev_workspace',
                    files_changed: context?.activeFilePath ? [context.activeFilePath] : undefined,
                  },
                  sourceType: 'dev_tool',
                  messageType: 'dev_session',
                  supabase: adminSupabase,
                });
              } catch (e) {
                console.error('[DevChat] ingest failed:', e);
              }

              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ done: true, fullText, provider })}\n\n`
              ));
              controller.close();
            },
            onError: (error) => {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ error: error.message })}\n\n`
              ));
              controller.close();
            },
          });
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    console.error('[DevChat] error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
