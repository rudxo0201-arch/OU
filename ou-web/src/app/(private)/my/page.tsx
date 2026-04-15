import { createClient } from '@/lib/supabase/server';
import { MyPageClient } from './MyPageClient';
import { redirect } from 'next/navigation';

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/my');

  const [{ data: savedViews }, { data: nodes }] = await Promise.all([
    supabase
      .from('saved_views')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('data_nodes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  // 노드 ID 목록으로 트리플 조회 → 그래프 엣지 생성
  const nodeIds = (nodes ?? []).map(n => n.id);
  let links: Array<{ source: string; target: string; label: string }> = [];

  if (nodeIds.length > 0) {
    const { data: triples } = await supabase
      .from('triples')
      .select('node_id, subject, predicate, object')
      .in('node_id', nodeIds)
      .limit(500);

    if (triples) {
      // 노드의 raw 텍스트로 매칭하여 링크 생성
      const nodeByRaw = new Map<string, string>();
      for (const n of nodes ?? []) {
        const raw = (n.raw ?? '').toLowerCase();
        nodeByRaw.set(raw, n.id);
        // 짧은 키워드도 매핑
        const words = raw.split(/\s+/).filter((w: string) => w.length >= 2);
        for (const w of words) {
          if (!nodeByRaw.has(w)) nodeByRaw.set(w, n.id);
        }
      }

      const linkSet = new Set<string>();
      for (const t of triples) {
        const subjectLower = t.subject.toLowerCase();
        const objectLower = t.object.toLowerCase();

        // subject/object가 다른 노드의 raw에 포함되면 링크 생성
        for (const n of nodes ?? []) {
          if (n.id === t.node_id) continue;
          const nRaw = (n.raw ?? '').toLowerCase();
          if (nRaw.includes(subjectLower) || nRaw.includes(objectLower) ||
              subjectLower.includes(nRaw) || objectLower.includes(nRaw)) {
            const key = [t.node_id, n.id].sort().join('-');
            if (!linkSet.has(key)) {
              linkSet.add(key);
              links.push({ source: t.node_id, target: n.id, label: t.predicate });
            }
          }
        }
      }
    }
  }

  return <MyPageClient savedViews={savedViews ?? []} nodes={nodes ?? []} links={links} />;
}
