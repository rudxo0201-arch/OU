import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/my';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // 신규 가입자 감지 (10초 이내 가입)
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', data.user.id)
        .single();

      const isNewUser = profile &&
        Date.now() - new Date(profile.created_at).getTime() < 10_000;

      // 신규 가입: next가 /chat이면 유지 (게스트 대화 복원), 아니면 온보딩 채팅으로
      // 기존 사용자: next 파라미터 그대로 사용
      const redirectPath = isNewUser
        ? (next === '/chat' ? '/chat' : '/chat?onboarding=true')
        : next;
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
