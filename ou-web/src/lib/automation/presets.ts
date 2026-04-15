/**
 * Pre-built Automation Presets
 *
 * 도메인 중립적 프리셋: 관리자 또는 회원이 빠르게 자동화를 생성할 수 있도록.
 */

import type { AutomationTrigger, AutomationAction } from './engine';
import { automationToDomainData } from './engine';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AutomationPreset {
  name: string;
  description: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
}

/**
 * 시나리오 → 인스타그램 포스트 자동화
 *
 * 트리거: domain='knowledge' + tags에 'scenario' 포함
 * 액션:
 *   1. run_llm: 인스타그램 포스트로 변환
 *   2. post_social: 인스타그램 draft 생성
 */
export const SCENARIO_TO_INSTAGRAM: AutomationPreset = {
  name: '시나리오 → 인스타 포스트',
  description: '새 시나리오가 생성되면 인스타그램 포스트를 자동 생성합니다',
  trigger: {
    type: 'node_created',
    config: {
      domain: 'knowledge',
      tags: ['scenario'],
    },
  },
  actions: [
    {
      type: 'run_llm',
      config: {
        prompt: '이 시나리오를 인스타그램 포스트로 변환해줘. 짧은 문단, 이모지, 해시태그를 포함해서 매력적인 포스트로 만들어줘.',
      },
    },
    {
      type: 'post_social',
      config: {
        platform: 'instagram',
        template: '{llm_output}',
      },
    },
  ],
};

/** All available presets */
export const PRESETS: AutomationPreset[] = [
  SCENARIO_TO_INSTAGRAM,
];

/**
 * Create a preset automation for a user
 */
export async function createPresetAutomation(
  preset: AutomationPreset,
  userId: string,
  supabase: SupabaseClient,
): Promise<{ id: string } | null> {
  const domainData = automationToDomainData({
    name: preset.name,
    trigger: preset.trigger,
    actions: preset.actions,
    enabled: true,
  });

  const { data, error } = await supabase
    .from('data_nodes')
    .insert({
      user_id: userId,
      title: preset.name,
      domain: 'automation',
      raw: `자동화: ${preset.name} — ${preset.description}`,
      domain_data: domainData,
      tags: ['automation', 'preset'],
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Presets] Failed to create preset:', error.message);
    return null;
  }

  return { id: data.id };
}
