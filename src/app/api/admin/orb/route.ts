import { NextRequest } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import { chatWithFallback } from '@/lib/llm/router';
import { buildAdminSystemPrompt } from '@/lib/llm/admin-prompts';
import { createAdminClient } from '@/lib/supabase/admin';
import { ALLOWED_TABLES } from '@/lib/admin/table-schemas';
import type { LLMMessage } from '@/lib/llm/types';

export const maxDuration = 60;

/** json:action 블록 파싱 */
function parseAction(text: string): Record<string, unknown> | null {
  const match = text.match(/```json:action\s*([\s\S]*?)```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

/** 액션 블록 제거한 클린 텍스트 */
function stripAction(text: string): string {
  return text.replace(/```json:action[\s\S]*?```/g, '').trim();
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new Response(JSON.stringify({ error: '권한이 없습니다.' }), { status: 403 });
  }

  const body: {
    messages: Array<{ role: string; content: string }>;
    executeAction?: { type: string; sql?: string; table?: string; filter?: Record<string, unknown>; data?: Record<string, unknown>; ddl?: string; ids?: string[] };
  } = await req.json();

  const db = createAdminClient();

  // ─── 액션 직접 실행 (관리자가 확인 후) ──────────────────────
  if (body.executeAction) {
    const act = body.executeAction;

    try {
      if (act.type === 'query' && act.sql) {
        const { data, error } = await db.rpc('exec_sql_readonly', { sql: act.sql }) as { data: unknown; error: unknown };
        if (error) throw new Error(String(error));
        return Response.json({ type: 'query_result', data });
      }

      if (act.type === 'update' && act.table && ALLOWED_TABLES.includes(act.table) && act.filter && act.data) {
        let q = db.from(act.table).update(act.data);
        for (const [col, val] of Object.entries(act.filter)) {
          q = q.eq(col, val as string);
        }
        const { error, count } = await q;
        if (error) throw new Error(error.message);
        return Response.json({ type: 'mutation_result', count });
      }

      if (act.type === 'create' && act.table && ALLOWED_TABLES.includes(act.table) && act.data) {
        const { data, error } = await db.from(act.table).insert(act.data).select().single();
        if (error) throw new Error(error.message);
        return Response.json({ type: 'mutation_result', data });
      }

      if (act.type === 'delete' && act.table && ALLOWED_TABLES.includes(act.table) && act.filter) {
        let q = db.from(act.table).delete();
        for (const [col, val] of Object.entries(act.filter)) {
          q = q.eq(col, val as string);
        }
        const { error, count } = await q;
        if (error) throw new Error(error.message);
        return Response.json({ type: 'mutation_result', count });
      }

      if (act.type === 'ddl' && act.ddl) {
        const { error } = await db.rpc('exec_sql', { sql: act.ddl }) as { error: unknown };
        if (error) throw new Error(String(error));
        return Response.json({ type: 'ddl_result', ok: true });
      }

      return Response.json({ error: '지원하지 않는 액션입니다.' }, { status: 400 });
    } catch (e) {
      return Response.json({ error: String(e) }, { status: 500 });
    }
  }

  // ─── LLM 스트리밍 ─────────────────────────────────────────
  const messages: LLMMessage[] = body.messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // 테이블 통계 수집 (비동기, 실패 무시)
  let tableStats: Record<string, number> = {};
  try {
    const counts = await Promise.all(
      ALLOWED_TABLES.slice(0, 10).map(async t => {
        const { count } = await db.from(t).select('*', { count: 'exact', head: true });
        return [t, count ?? 0] as [string, number];
      })
    );
    tableStats = Object.fromEntries(counts);
  } catch { /* ignore */ }

  const systemPrompt = buildAdminSystemPrompt(tableStats);

  const encoder = new TextEncoder();
  let fullText = '';

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      chatWithFallback({
        messages,
        systemPrompt,
        userPlan: 'pro', // 관리자는 항상 Sonnet
        onChunk: (text) => {
          fullText += text;
          send({ type: 'text', text });
        },
        onComplete: (full) => {
          const action = parseAction(full);
          const cleanText = stripAction(full);
          send({ type: 'done', text: cleanText, action });
          controller.close();
        },
        onError: (err) => {
          send({ type: 'error', message: err.message });
          controller.close();
        },
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
