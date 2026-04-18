import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveApiKeyUser } from '@/lib/auth/api-key';
import { ingestConversation } from '@/lib/pipeline/ingest-conversation';

/**
 * POST /api/ingest/conversation
 *
 * Claude Code 등 외부 개발 도구의 대화 로그를 OU에 수집한다.
 * 인증: cookie 세션 우선, 실패 시 API Key 폴백 (ou_sk_* Bearer token).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let userId: string;
  let dbClient = supabase;

  if (user) {
    userId = user.id;
  } else {
    // API Key 폴백 (Claude Code 등 외부 도구용)
    const apiKeyAuth = await resolveApiKeyUser(req);
    if (!apiKeyAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = apiKeyAuth.userId;
    dbClient = createAdminClient();
  }

  const body = await req.json();
  const { messages, metadata } = body as {
    messages: Array<{ role: string; content: string }>;
    metadata?: {
      source?: string;
      working_directory?: string;
      files_changed?: string[];
      git_diff_summary?: string;
      session_id?: string;
    };
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array required' }, { status: 400 });
  }

  try {
    const result = await ingestConversation({
      userId,
      messages,
      metadata,
      sourceType: 'dev_tool',
      messageType: 'dev_session',
      supabase: dbClient,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error('[Ingest] failed:', e);
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 });
  }
}
