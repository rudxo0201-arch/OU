import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';
import { seedAdminData } from '@/lib/seed/admin-seed';
import { seedParadigmData } from '@/lib/seed/paradigm-seed';
import { seedBonchoData } from '@/lib/seed/boncho-seed';
import { seedBangjeData } from '@/lib/seed/bangje-seed';

export async function POST(request: Request) {
  try {
    // Admin-only check
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // type 파라미터로 시드 종류 선택 (기본: intro)
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') ?? 'intro';

    if (type === 'boncho' || type === 'boncho-all') {
      const scope = type === 'boncho-all' ? 'all' : 'starred';
      const result = await seedBonchoData(supabase, scope);
      return NextResponse.json({
        success: true,
        created: result.created,
        skipped: result.skipped,
        message: result.created > 0
          ? `본초 DataNode ${result.created}개 생성 (${scope}).`
          : '이미 모든 본초 데이터가 존재합니다.',
      });
    }

    if (type === 'bangje' || type === 'bangje-all') {
      const scope = type === 'bangje-all' ? 'all' : 'starred';
      const result = await seedBangjeData(supabase, scope);
      return NextResponse.json({
        success: true,
        created: result.created,
        skipped: result.skipped,
        message: result.created > 0
          ? `방제 DataNode ${result.created}개 생성 (${scope}).`
          : '이미 모든 방제 데이터가 존재합니다.',
      });
    }

    if (type === 'paradigm') {
      const result = await seedParadigmData(supabase);
      return NextResponse.json({
        success: true,
        created: result.created,
        skipped: result.skipped,
        viewsCreated: result.viewsCreated,
        message: result.created > 0
          ? `DataNode ${result.created}개, 뷰 ${result.viewsCreated}개 생성.`
          : '이미 모든 패러다임 인사이트가 존재합니다.',
      });
    }

    if (type === 'all') {
      const introResult = await seedAdminData(supabase);
      const paradigmResult = await seedParadigmData(supabase);
      return NextResponse.json({
        success: true,
        intro: { created: introResult.created, skipped: introResult.skipped },
        paradigm: { created: paradigmResult.created, skipped: paradigmResult.skipped },
        message: `소개 ${introResult.created}개, 패러다임 ${paradigmResult.created}개 생성.`,
      });
    }

    // 기본: intro
    const result = await seedAdminData(supabase);
    return NextResponse.json({
      success: true,
      created: result.created,
      skipped: result.skipped,
      message: result.created > 0
        ? `${result.created}개의 소개 데이터를 생성했습니다.`
        : '이미 모든 소개 데이터가 존재합니다.',
    });
  } catch (e: any) {
    console.error('[Admin/Seed] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
