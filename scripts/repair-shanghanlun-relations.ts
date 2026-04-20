/**
 * 상한론 node_relations 보수 스크립트
 * 기존 시딩된 조문 노드에 방제/한자 엣지가 없는 경우 추가
 *
 * Usage:
 *   npx tsx scripts/repair-shanghanlun-relations.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function extractHanjaChars(text: string): string[] {
  const chars = new Set<string>();
  for (const ch of text) {
    if (ch >= '\u4E00' && ch <= '\u9FFF') chars.add(ch);
    if (ch >= '\u3400' && ch <= '\u4DBF') chars.add(ch);
  }
  return Array.from(chars);
}

async function main() {
  console.log('\n🔧 상한론 node_relations 보수 시작\n');

  // 1. 상한론 노드 전체 조회
  const allNodes: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('data_nodes')
      .select('id, domain_data')
      .eq('is_admin_node', true)
      .filter('domain_data->>type', 'eq', 'shanghanlun')
      .range(from, from + 499);
    if (!data || data.length === 0) break;
    allNodes.push(...data);
    if (data.length < 500) break;
    from += 500;
  }
  console.log(`조문 노드 ${allNodes.length}개 로드`);

  // 2. 방제 노드 맵 구축
  const formulaNodeMap = new Map<string, string>();
  from = 0;
  while (true) {
    const { data } = await supabase
      .from('data_nodes')
      .select('id, domain_data')
      .eq('is_admin_node', true)
      .not('domain_data->>formula_id', 'is', null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const n of data) {
      const fid = (n as any).domain_data?.formula_id;
      if (fid) formulaNodeMap.set(fid, n.id);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`방제 노드 ${formulaNodeMap.size}개 로드`);

  // 3. 한자 노드 맵 구축
  const allChars = Array.from(
    new Set(allNodes.flatMap(n => extractHanjaChars((n as any).domain_data?.original_text ?? '')))
  );
  console.log(`고유 한자 ${allChars.length}자 룩업 중...`);

  const hanjaNodeMap = new Map<string, string>();
  const BATCH = 500;
  for (let i = 0; i < allChars.length; i += BATCH) {
    const batch = allChars.slice(i, i + BATCH);
    const { data } = await supabase
      .from('data_nodes')
      .select('id, domain_data')
      .eq('is_admin_node', true)
      .in('domain_data->>char', batch);
    for (const n of data ?? []) {
      const ch = (n as any).domain_data?.char;
      if (ch) hanjaNodeMap.set(ch, n.id);
    }
  }
  console.log(`한자 매핑 ${hanjaNodeMap.size}자`);

  // 4. 기존 relations 조회 (중복 방지)
  const existingRels = new Set<string>();
  from = 0;
  while (true) {
    const { data } = await supabase
      .from('node_relations')
      .select('source_node_id, target_node_id')
      .in('source_node_id', allNodes.map(n => n.id))
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) {
      existingRels.add(`${r.source_node_id}:${r.target_node_id}`);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`기존 relations ${existingRels.size}개`);

  // 5. 방제 엣지 삽입
  let formulaCount = 0;
  let hanjaCount = 0;

  for (const node of allNodes) {
    const d = (node as any).domain_data;
    const relatedFormulas: string[] = d?.related_formulas ?? [];

    const formulaRels = relatedFormulas
      .map((fid: string) => formulaNodeMap.get(fid))
      .filter((tid): tid is string => !!tid)
      .filter(tid => !existingRels.has(`${node.id}:${tid}`))
      .map(tid => ({
        source_node_id: node.id,
        target_node_id: tid,
        relation_type: 'involves',
        weight: 1.5,
        source: 'sql',
              }));

    if (formulaRels.length > 0) {
      const { error } = await supabase.from('node_relations').insert(formulaRels);
      if (!error) formulaCount += formulaRels.length;
    }

    // 한자 엣지
    const chars = extractHanjaChars(d?.original_text ?? '');
    const hanjaRels = chars
      .map(ch => hanjaNodeMap.get(ch))
      .filter((tid): tid is string => !!tid)
      .filter(tid => !existingRels.has(`${node.id}:${tid}`))
      .map(tid => ({
        source_node_id: node.id,
        target_node_id: tid,
        relation_type: 'involves',
        weight: 1.0,
        source: 'sql',
              }));

    if (hanjaRels.length > 0) {
      const { error } = await supabase.from('node_relations').insert(hanjaRels);
      if (!error) hanjaCount += hanjaRels.length;
    }
  }

  console.log(`\n✅ 완료`);
  console.log(`   방제 relations: ${formulaCount}개`);
  console.log(`   한자 relations: ${hanjaCount}개`);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
