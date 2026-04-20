/**
 * YouTube 채널 ID 저장/조회
 *
 * 회원의 구독 채널 ID 목록을 Redis에 저장.
 * OAuth로 한 번 가져온 뒤 RSS로 영상을 fetch — API 할당량 없음.
 *
 * 보안: 회원 user_id 기반 키. 서버사이드 only.
 * TTL: 30일 (만료 시 재연동 안내)
 */

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30일

function channelKey(userId: string) {
  return `yt:channels:${userId}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _redis: any = null;

async function getRedis() {
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) return null;
  if (_redis) return _redis;
  try {
    const moduleName = '@upstash/redis';
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require(moduleName);
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    });
    return _redis;
  } catch {
    return null;
  }
}

export async function saveChannelIds(userId: string, channelIds: string[]): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try {
    await r.set(channelKey(userId), JSON.stringify(channelIds), { ex: TTL_SECONDS });
  } catch {
    // silent fail — RSS 없으면 URL 붙여넣기로 대체
  }
}

export async function getChannelIds(userId: string): Promise<string[] | null> {
  const r = await getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(channelKey(userId));
    if (!raw) return null;
    return JSON.parse(raw as string) as string[];
  } catch {
    return null;
  }
}

export async function clearChannelIds(userId: string): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try {
    await r.del(channelKey(userId));
  } catch {}
}

export async function isConnected(userId: string): Promise<boolean> {
  const ids = await getChannelIds(userId);
  return ids !== null && ids.length > 0;
}
