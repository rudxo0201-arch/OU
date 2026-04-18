import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';
import { generateBangjeTriples } from '@/lib/seed/bangje-triples';

export async function POST() {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const result = await generateBangjeTriples(supabase);

    return NextResponse.json({
      success: true,
      ...result,
      message: result.generated > 0
        ? `방제 ${result.total}개에서 관계 ${result.generated}개 생성.`
        : '관계를 생성할 방제가 없습니다.',
    });
  } catch (e: any) {
    console.error('[Admin/Bangje/Triples] Error:', e);
    return NextResponse.json(
      { error: e.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
