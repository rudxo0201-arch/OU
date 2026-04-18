import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidFeatureId } from '@/lib/features/registry';
import { COPY } from '@/lib/copy';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: COPY.error.unauthorized }, { status: 401 });
    }

    let body: { featureId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    const { featureId } = body;
    if (!featureId || !isValidFeatureId(featureId)) {
      return NextResponse.json({ message: COPY.error.generic }, { status: 400 });
    }

    // features_unlocked 배열에 추가 (중복 방지)
    const { error } = await supabase.rpc('append_feature_unlocked', {
      p_user_id: user.id,
      p_feature_id: featureId,
    });

    // RPC가 없으면 직접 업데이트
    if (error) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('features_unlocked')
        .eq('id', user.id)
        .single();

      const current: string[] = profile?.features_unlocked ?? [];
      if (!current.includes(featureId)) {
        await supabase
          .from('profiles')
          .update({ features_unlocked: [...current, featureId] })
          .eq('id', user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: COPY.error.generic }, { status: 500 });
  }
}
