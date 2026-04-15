/**
 * Rule Engine — 로직 규칙 실행 엔진
 *
 * logic_rules 테이블에 등록된 규칙을 실행한다.
 * 규칙이 처리 가능하면 LLM 호출 없이 결과를 반환.
 * 처리 불가(null 반환) 시 LLM 폴백.
 */

import { createClient } from '@/lib/supabase/server';

export interface RuleResult {
  ruleId: string;
  output: unknown;
  confidence: number;
}

interface LogicRule {
  id: string;
  operation: string;
  rule_type: string;
  rule_config: Record<string, unknown>;
  accuracy: number | null;
  coverage: number | null;
  status: string;
}

/**
 * 주어진 operation에 대해 active 규칙을 조회하고 실행한다.
 * 규칙이 입력을 처리 가능하면 RuleResult를, 불가하면 null을 반환.
 */
export async function tryRuleFirst(
  operation: string,
  input: string,
): Promise<RuleResult | null> {
  try {
    const supabase = await createClient();

    const { data: rules } = await supabase
      .from('logic_rules')
      .select('id, operation, rule_type, rule_config, accuracy, coverage, status')
      .eq('operation', operation)
      .eq('status', 'active')
      .order('accuracy', { ascending: false })
      .limit(5);

    if (!rules?.length) return null;

    for (const rule of rules as LogicRule[]) {
      const result = executeRule(rule, input);
      if (result !== null) {
        return {
          ruleId: rule.id,
          output: result,
          confidence: rule.accuracy ?? 0,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 단일 규칙을 실행한다.
 * 처리 가능하면 결과를, 불가하면 null을 반환.
 */
function executeRule(rule: LogicRule, input: string): unknown | null {
  switch (rule.rule_type) {
    case 'regex':
      return executeRegexRule(rule.rule_config, input);
    case 'lookup':
      return executeLookupRule(rule.rule_config, input);
    case 'template':
      return executeTemplateRule(rule.rule_config, input);
    default:
      return null;
  }
}

/**
 * 정규식 기반 규칙 실행.
 * rule_config: { patterns: [{ regex, predicate, subjectGroup, objectGroup }] }
 */
function executeRegexRule(
  config: Record<string, unknown>,
  input: string,
): unknown | null {
  const patterns = config.patterns as Array<{
    regex: string;
    predicate: string;
    subjectGroup: number;
    objectGroup: number;
  }> | undefined;

  if (!patterns?.length) return null;

  const results: Array<{ subject: string; predicate: string; object: string }> = [];

  const lines = input.split('\n').filter(Boolean);
  for (const line of lines) {
    for (const p of patterns) {
      try {
        const match = line.match(new RegExp(p.regex));
        if (match && match[p.subjectGroup] && match[p.objectGroup]) {
          results.push({
            subject: match[p.subjectGroup].trim(),
            predicate: p.predicate,
            object: match[p.objectGroup].trim(),
          });
        }
      } catch {
        // 잘못된 regex → 스킵
      }
    }
  }

  // 규칙이 하나도 매칭 안 되면 null (LLM 폴백)
  return results.length > 0 ? results : null;
}

/**
 * 룩업 테이블 기반 규칙 실행.
 * rule_config: { table: { "입력키": 출력값 } }
 */
function executeLookupRule(
  config: Record<string, unknown>,
  input: string,
): unknown | null {
  const table = config.table as Record<string, unknown> | undefined;
  if (!table) return null;

  const key = input.trim().toLowerCase();
  return table[key] ?? null;
}

/**
 * 템플릿 기반 규칙 실행.
 * rule_config: { templates: [{ condition, output }] }
 */
function executeTemplateRule(
  config: Record<string, unknown>,
  input: string,
): unknown | null {
  const templates = config.templates as Array<{
    condition: string;
    output: unknown;
  }> | undefined;

  if (!templates?.length) return null;

  const lower = input.toLowerCase();
  for (const t of templates) {
    if (lower.includes(t.condition.toLowerCase())) {
      return t.output;
    }
  }

  return null;
}

/**
 * 규칙 검증 결과를 rule_validations에 기록한다.
 * 섀도 모드에서 규칙 출력 vs LLM 출력 비교용.
 */
export async function logRuleValidation(params: {
  ruleId: string;
  inputText: string;
  ruleOutput: unknown;
  llmOutput: unknown;
  isMatch: boolean;
  diffDetail?: unknown;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('rule_validations').insert({
      rule_id: params.ruleId,
      input_text: params.inputText.slice(0, 2000),
      rule_output: params.ruleOutput,
      llm_output: params.llmOutput,
      is_match: params.isMatch,
      diff_detail: params.diffDetail ?? null,
    });
  } catch (e) {
    console.error('[RuleEngine] validation log failed:', e);
  }
}
