import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const API_KEY_PREFIX = 'ou_sk_';

/**
 * API Key 생성 — 평문은 1회만 반환, DB에는 SHA256 해시만 저장
 * 설정 페이지에서 호출 (사용자 세션 기반 Supabase 클라이언트 사용)
 */
export async function generateApiKey(supabase: SupabaseClient, userId: string, name: string) {
  const rawKey = API_KEY_PREFIX + randomBytes(32).toString('hex');
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12) + '...';

  const { data, error } = await supabase.from('api_keys').insert({
    user_id: userId,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name,
  }).select('id, key_prefix, name, created_at').single();

  if (error) throw new Error(`API key creation failed: ${error.message}`);

  return {
    ...data,
    plainKey: rawKey,
  };
}

/**
 * API Key로 user_id 확인 — MCP 요청 인증용
 * Authorization: Bearer ou_sk_... 헤더에서 추출
 * admin client 사용 (MCP 클라이언트에는 Supabase 세션 없음)
 */
export async function resolveApiKeyUser(
  request: Request
): Promise<{ userId: string; keyId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token.startsWith(API_KEY_PREFIX)) return null;

  const keyHash = hashKey(token);
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('api_keys')
    .select('id, user_id, expires_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single();

  if (!data) return null;

  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  // last_used_at 비동기 업데이트
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {});

  return { userId: data.user_id, keyId: data.id };
}

/**
 * API Key 목록 조회 (사용자 세션 기반)
 */
export async function listApiKeys(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, key_prefix, name, scopes, last_used_at, created_at')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`API key list failed: ${error.message}`);
  return data ?? [];
}

/**
 * API Key 폐기 (사용자 세션 기반)
 */
export async function revokeApiKey(supabase: SupabaseClient, userId: string, keyId: string) {
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) throw new Error(`API key revocation failed: ${error.message}`);
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
