import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 공유 가능한 팩트 필드 목록 (감정/메모 제외)
const SHAREABLE_FIELDS = [
  'name', 'nickname', 'relationship', 'type',
  'contact', 'email', 'address', 'sns',
  'birthday', 'bloodType', 'mbti',
  'job', 'school', 'organization',
  'hobby', 'likes', 'dislikes', 'image',
];

// POST /api/profile-card/share
// body: { nodeId: string, fields: string[] }
// → 공유 토큰 생성, 링크 반환
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { nodeId, fields } = await request.json();
  if (!nodeId || !Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: 'nodeId와 fields가 필요합니다' }, { status: 400 });
  }

  // 감정/메모 필드 필터링 (안전 장치)
  const safeFields = fields.filter((f: string) => SHAREABLE_FIELDS.includes(f));
  if (safeFields.length === 0) {
    return NextResponse.json({ error: '공유 가능한 필드가 없습니다' }, { status: 400 });
  }

  // 노드 소유권 확인
  const { data: node } = await supabase
    .from('data_nodes')
    .select('id, domain, domain_data')
    .eq('id', nodeId)
    .eq('user_id', user.id)
    .single();

  if (!node || node.domain !== 'relation') {
    return NextResponse.json({ error: '인물 노드를 찾을 수 없습니다' }, { status: 404 });
  }

  // 공유할 필드 값만 추출
  const domainData = node.domain_data as Record<string, unknown>;
  const sharedFields: Record<string, unknown> = {};
  for (const field of safeFields) {
    if (domainData[field] !== undefined && domainData[field] !== null && domainData[field] !== '') {
      sharedFields[field] = domainData[field];
    }
  }

  // 토큰 생성 (7일 만료)
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('profile_shares').insert({
    token,
    sharer_id: user.id,
    node_id: nodeId,
    shared_fields: sharedFields,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: '공유 링크 생성에 실패했습니다' }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ouuniverse.com';
  return NextResponse.json({ url: `${siteUrl}/invite/${token}` });
}
