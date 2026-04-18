import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = crypto.randomUUID();

    const { error } = await supabase.from('group_invites').insert({
      group_id: params.groupId,
      token,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      console.error('[GroupInvite] Supabase error:', error.message);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/join/${token}`;
    return NextResponse.json({ inviteUrl });
  } catch (e) {
    console.error('[GroupInvite] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
