/**
 * 회원 외부 LLM API 키 관리 (BYOK)
 *
 * 암호화 저장 (AES-256-GCM), 서버사이드에서만 복호화
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '@/lib/crypto/key-encryption';
import { createAdminClient } from '@/lib/supabase/admin';

type Provider = 'openai' | 'anthropic' | 'google';

/** 키 prefix 생성 (앞 8자 + ...) */
function makePrefix(key: string): string {
  return key.slice(0, 8) + '...';
}

/**
 * 외부 LLM 키 저장 (암호화 + upsert)
 */
export async function saveLLMKey(
  supabase: SupabaseClient,
  userId: string,
  provider: Provider,
  plainKey: string,
  displayName?: string,
) {
  const { encrypted, iv, authTag } = encrypt(plainKey);
  const keyPrefix = makePrefix(plainKey);

  const { error } = await supabase
    .from('user_llm_keys')
    .upsert({
      user_id: userId,
      provider,
      encrypted_key: encrypted,
      iv,
      auth_tag: authTag,
      key_prefix: keyPrefix,
      display_name: displayName ?? '',
      is_valid: true,
      revoked_at: null,
    }, { onConflict: 'user_id,provider' });

  if (error) throw new Error(`LLM key save failed: ${error.message}`);
}

/**
 * 등록된 키 목록 (prefix만 반환, 복호화 안 함)
 */
export async function getLLMKeys(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_llm_keys')
    .select('provider, key_prefix, display_name, is_valid, last_used_at, created_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`LLM key list failed: ${error.message}`);
  return data ?? [];
}

/**
 * 키 삭제 (soft delete)
 */
export async function deleteLLMKey(supabase: SupabaseClient, userId: string, provider: Provider) {
  const { error } = await supabase
    .from('user_llm_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) throw new Error(`LLM key delete failed: ${error.message}`);
}

/**
 * 복호화된 키 반환 — chat API에서 호출 (admin client 사용)
 */
export async function decryptLLMKey(userId: string, provider: Provider): Promise<string | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('user_llm_keys')
    .select('encrypted_key, iv, auth_tag')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_valid', true)
    .is('revoked_at', null)
    .single();

  if (!data) return null;

  try {
    const plainKey = decrypt(data.encrypted_key, data.iv, data.auth_tag);

    // last_used_at 비동기 업데이트
    supabase
      .from('user_llm_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', provider)
      .then(() => {});

    return plainKey;
  } catch {
    // 복호화 실패 → is_valid = false
    supabase
      .from('user_llm_keys')
      .update({ is_valid: false })
      .eq('user_id', userId)
      .eq('provider', provider)
      .then(() => {});
    return null;
  }
}

/**
 * 키 유효성 검증 — 경량 API 호출로 확인
 */
export async function validateLLMKey(provider: Provider, plainKey: string): Promise<boolean> {
  try {
    switch (provider) {
      case 'anthropic': {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey: plainKey });
        await client.messages.create({
          model: 'claude-haiku-4-5-latest',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        });
        return true;
      }
      case 'openai': {
        const OpenAI = (await import('openai')).default;
        const client = new OpenAI({ apiKey: plainKey });
        await client.models.list();
        return true;
      }
      case 'google': {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(plainKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        await model.generateContent('hi');
        return true;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}
