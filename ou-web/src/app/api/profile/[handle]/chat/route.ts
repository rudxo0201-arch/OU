import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatWithFallback } from '@/lib/llm/router';
import type { LLMMessage } from '@/lib/llm/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;

  let body: { message?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message, history } = body;

  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = await createClient();

    // Look up user by handle
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, handle')
      .eq('handle', handle)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const displayName = profile.display_name ?? profile.handle;

    // Fetch public data_nodes for RAG context
    const { data: nodes } = await supabase
      .from('data_nodes')
      .select('domain, raw, created_at')
      .eq('user_id', profile.id)
      .eq('visibility', 'public')
      .neq('domain', '_admin_internal')
      .order('created_at', { ascending: false })
      .limit(30);

    // Build context from nodes
    const contextLines = (nodes ?? []).map(n => {
      const date = n.created_at
        ? new Date(n.created_at).toLocaleDateString('ko-KR')
        : '';
      return `[${n.domain}] ${n.raw} (${date})`;
    });

    const contextBlock = contextLines.length > 0
      ? `\n\n${displayName}님의 공개 기록:\n${contextLines.join('\n')}`
      : '';

    const systemPrompt = `너는 ${displayName}님의 공개된 기록을 바탕으로 답변하는 AI야. 본인인 척하지 마. '${displayName}님의 기록에 따르면...' 형태로 답변해. 기록에 없는 내용은 '공개된 기록에서 찾을 수 없어요'라고 해. 1-3문장으로 답변해.${contextBlock}`;

    // Build message history (max 10)
    const historyMessages: LLMMessage[] = (history ?? [])
      .slice(-10)
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const messages: LLMMessage[] = [
      ...historyMessages,
      { role: 'user', content: message },
    ];

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await chatWithFallback({
            messages,
            systemPrompt,
            userPlan: 'free',
            onChunk: (text) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            },
            onComplete: (fullText, provider) => {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ done: true, fullText, provider })}\n\n`
                )
              );
              controller.close();
            },
            onError: (error) => {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: error.message })}\n\n`
                )
              );
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
        Connection: 'keep-alive',
      },
    });
  } catch (e) {
    console.error('[ProfileChat] Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
