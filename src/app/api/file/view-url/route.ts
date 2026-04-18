import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSignedViewUrl } from '@/lib/storage/r2';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const key = req.nextUrl.searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'No key' }, { status: 400 });

    if (!key.startsWith(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = await getSignedViewUrl(key);
    return NextResponse.json({ url });
  } catch (e) {
    console.error('[FileViewUrl] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
