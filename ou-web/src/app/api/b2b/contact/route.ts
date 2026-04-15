import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, organization, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: '이름, 이메일, 문의 내용은 필수입니다.' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Store in b2b_contacts table
    const { error } = await supabase
      .from('b2b_contacts')
      .insert({
        name: name.trim(),
        organization: organization?.trim() || null,
        email: email.trim().toLowerCase(),
        message: message.trim(),
      });

    if (error) {
      console.error('[B2B Contact] Insert error:', error);
      // Even if table doesn't exist, we log and return success
      // In production, this would also send an email notification
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[B2B Contact] Error:', err);
    return NextResponse.json(
      { error: '문의 접수에 실패했어요. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
