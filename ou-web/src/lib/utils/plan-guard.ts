import { SupabaseClient } from '@supabase/supabase-js';

export type PlanFeature = 'ai_view_gen' | 'file_upload_unlimited' | 'group' | 'dev_workspace';

const FEATURE_PLANS: Record<PlanFeature, string[]> = {
  ai_view_gen: ['pro', 'team'],
  file_upload_unlimited: ['pro', 'team'],
  group: ['team'],
  dev_workspace: ['free', 'pro', 'team'], // 모든 플랜 허용 (Phase 2 전략)
};

/**
 * 사용자의 플랜이 해당 기능을 사용할 수 있는지 확인
 */
export async function checkPlanAccess(
  supabase: SupabaseClient,
  userId: string,
  feature: PlanFeature,
): Promise<{ allowed: boolean; plan: string }> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .single();

  const plan = sub?.plan || 'free';
  const status = sub?.status || 'active';

  // 만료된 구독은 free 취급
  if (status === 'expired') {
    return { allowed: FEATURE_PLANS[feature].includes('free'), plan: 'free' };
  }

  return {
    allowed: FEATURE_PLANS[feature].includes(plan),
    plan,
  };
}

/**
 * API 라우트에서 Pro 기능 체크 후 403 반환 헬퍼
 */
export function planDeniedResponse(feature: PlanFeature, plan: string) {
  const { NextResponse } = require('next/server');
  return NextResponse.json(
    {
      error: 'PRO_REQUIRED',
      message: '이 기능은 Pro 플랜 이상에서 사용할 수 있어요.',
      currentPlan: plan,
      requiredPlans: FEATURE_PLANS[feature],
    },
    { status: 403 },
  );
}
