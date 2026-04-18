/**
 * LLM Model Catalog — 프론트엔드/백엔드 공용
 */

export interface ModelDef {
  id: string;
  provider: 'anthropic' | 'openai' | 'google';
  displayName: string;
  /** free/pro = OU 제공, byok = 사용자 키 필요 */
  tier: 'free' | 'pro' | 'byok';
}

export const AVAILABLE_MODELS: ModelDef[] = [
  // OU 제공
  { id: 'claude-haiku-4-5-20251001', provider: 'anthropic', displayName: 'Claude Haiku 4.5', tier: 'free' },
  { id: 'claude-sonnet-4-5', provider: 'anthropic', displayName: 'Claude Sonnet 4.5', tier: 'pro' },
  // BYOK — Anthropic
  { id: 'claude-opus-4-6', provider: 'anthropic', displayName: 'Claude Opus 4.6', tier: 'byok' },
  // BYOK — OpenAI
  { id: 'gpt-4o', provider: 'openai', displayName: 'GPT-4o', tier: 'byok' },
  { id: 'gpt-4o-mini', provider: 'openai', displayName: 'GPT-4o Mini', tier: 'byok' },
  // BYOK — Google
  { id: 'gemini-2.0-flash', provider: 'google', displayName: 'Gemini 2.0 Flash', tier: 'byok' },
  { id: 'gemini-2.5-pro-preview-05-06', provider: 'google', displayName: 'Gemini 2.5 Pro', tier: 'byok' },
];

/** model id → provider name */
export const MODEL_PROVIDER_MAP: Record<string, 'anthropic' | 'openai' | 'google'> =
  Object.fromEntries(AVAILABLE_MODELS.map(m => [m.id, m.provider]));

/** OU가 자체 키로 제공하는 모델인지 */
export function isOUModel(modelId: string): boolean {
  const m = AVAILABLE_MODELS.find(x => x.id === modelId);
  return m ? m.tier !== 'byok' : false;
}

/** provider별 사용 가능 모델 필터 */
export function getModelsByProvider(provider: string): ModelDef[] {
  return AVAILABLE_MODELS.filter(m => m.provider === provider);
}
