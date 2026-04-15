import crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any = null;

async function getRedis(): Promise<any | null> {
  if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) return null;
  if (!redis) {
    try {
      // Dynamic require to avoid webpack static resolution when package is not installed
      const moduleName = '@upstash/redis';
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Redis } = require(moduleName);
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN,
      });
    } catch {
      // @upstash/redis not installed
      return null;
    }
  }
  return redis;
}

export function generateCacheKey(messages: { role: string; content: string }[]): string {
  // Only hash the last 3 messages for cache key
  const lastMessages = messages.slice(-3);
  const content = JSON.stringify(lastMessages);
  return `llm:${crypto.createHash('md5').update(content).digest('hex')}`;
}

export async function getCachedResponse(key: string): Promise<string | null> {
  const r = await getRedis();
  if (!r) return null;
  try {
    return (await r.get(key)) as string | null;
  } catch {
    return null;
  }
}

export async function setCachedResponse(key: string, response: string, ttlSeconds = 3600): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try {
    await r.set(key, response, { ex: ttlSeconds });
  } catch {
    // silent fail
  }
}
