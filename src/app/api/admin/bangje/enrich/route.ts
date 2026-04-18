import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';
import { enrichBangjeData } from '@/lib/seed/bangje-enrich';

export async function POST(request: Request) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get('scope') ?? 'pending') as 'starred' | 'all' | 'pending';
    const batchSize = parseInt(searchParams.get('batchSize') ?? '5', 10);
    const dryRun = searchParams.get('dryRun') === 'true';

    const result = await enrichBangjeData(supabase, scope, batchSize, dryRun);

    return NextResponse.json({
      success: true,
      ...result,
      message: result.enriched > 0
        ? `방제 ${result.enriched}개 보강 완료.`
        : '보강할 방제가 없습니다.',
    });
  } catch (e: any) {
    console.error('[Admin/Bangje/Enrich] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
