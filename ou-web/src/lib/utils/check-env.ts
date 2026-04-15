/**
 * API Key / Environment Variable validation
 *
 * Server-side only. Returns which external services are configured.
 * Used by admin dashboard to show service health.
 */

export interface ServiceStatus {
  anthropic: boolean;
  openai: boolean;
  gemini: boolean;
  r2: boolean;
  stripe: boolean;
  supabase: boolean;
  upstash: boolean;
}

export function checkEnv(): ServiceStatus {
  return {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    r2: !!(
      process.env.CLOUDFLARE_R2_BUCKET &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_SECRET_KEY
    ),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    supabase: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    upstash: !!(
      process.env.UPSTASH_REDIS_URL &&
      process.env.UPSTASH_REDIS_TOKEN
    ),
  };
}

/**
 * Service label map (Korean)
 */
export const SERVICE_LABELS: Record<keyof ServiceStatus, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (임베딩/폴백)',
  gemini: 'Gemini (OCR)',
  r2: 'Cloudflare R2 (파일)',
  stripe: 'Stripe (결제)',
  supabase: 'Supabase (DB/인증)',
  upstash: 'Upstash Redis (캐시)',
};
