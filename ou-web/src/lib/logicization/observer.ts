/**
 * LLM Call Observer — 모든 LLM 호출의 입출력을 기록
 *
 * api_cost_log는 비용만 기록하지만, llm_call_log는 입출력 데이터를 포함.
 * 이 데이터가 축적되면 패턴 감지 → 규칙 추출 → LLM 대체가 가능해진다.
 */

import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export interface LLMCallRecord {
  operation: string;
  inputText: string;
  outputText: string;
  outputParsed?: unknown;
  model: string;
  tokensUsed?: number;
  costUsd?: number;
  userId?: string;
  nodeId?: string;
}

/**
 * LLM 호출 결과를 llm_call_log에 기록한다.
 * 실패해도 메인 로직에 영향 없음 (fire-and-forget).
 */
export async function logLLMCall(record: LLMCallRecord): Promise<void> {
  try {
    const supabase = await createClient();
    const inputHash = crypto
      .createHash('sha256')
      .update(record.inputText)
      .digest('hex');

    await supabase.from('llm_call_log').insert({
      operation: record.operation,
      input_hash: inputHash,
      input_text: record.inputText.slice(0, 2000),
      output_text: record.outputText.slice(0, 2000),
      output_parsed: record.outputParsed ?? null,
      model: record.model,
      tokens_used: record.tokensUsed ?? null,
      cost_usd: record.costUsd ?? null,
      user_id: record.userId ?? null,
      node_id: record.nodeId ?? null,
    });
  } catch (e) {
    console.error('[Observer] llm_call_log insert failed:', e);
  }
}

/**
 * 동일 입력 해시로 기존 LLM 결과를 조회한다.
 * 캐시 히트 시 LLM 호출을 스킵할 수 있다.
 */
export async function findCachedLLMResult(
  operation: string,
  inputText: string,
): Promise<{ outputText: string; outputParsed: unknown } | null> {
  try {
    const supabase = await createClient();
    const inputHash = crypto
      .createHash('sha256')
      .update(inputText)
      .digest('hex');

    const { data } = await supabase
      .from('llm_call_log')
      .select('output_text, output_parsed')
      .eq('operation', operation)
      .eq('input_hash', inputHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      return {
        outputText: data.output_text,
        outputParsed: data.output_parsed,
      };
    }
    return null;
  } catch {
    return null;
  }
}
