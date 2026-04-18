import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveLLMKey, getLLMKeys, deleteLLMKey, validateLLMKey } from '@/lib/auth/llm-key';

export const runtime = 'nodejs';

const VALID_PROVIDERS = ['openai', 'anthropic', 'google'] as const;
type Provider = typeof VALID_PROVIDERS[number];

/**
 * GET /api/settings/llm-keys — 등록된 외부 LLM 키 목록
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await getLLMKeys(supabase, user.id);
  return NextResponse.json({ keys });
}

/**
 * POST /api/settings/llm-keys — 외부 LLM 키 등록
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider, apiKey, displayName } = await req.json();

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
  }

  // 유효성 검증
  const isValid = await validateLLMKey(provider as Provider, apiKey.trim());
  if (!isValid) {
    return NextResponse.json({ error: 'API key validation failed' }, { status: 400 });
  }

  await saveLLMKey(supabase, user.id, provider as Provider, apiKey.trim(), displayName);
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/settings/llm-keys — 외부 LLM 키 삭제
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { provider } = await req.json();
  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  await deleteLLMKey(supabase, user.id, provider as Provider);
  return NextResponse.json({ success: true });
}
