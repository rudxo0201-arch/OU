import { NextRequest, NextResponse } from 'next/server';
import { logSearch } from '@/lib/logging/search-log';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    void logSearch(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
