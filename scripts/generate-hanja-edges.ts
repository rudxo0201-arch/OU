/**
 * 한자 노드 간 엣지(node_relations) 자동 생성
 *
 * Usage: npx tsx scripts/generate-hanja-edges.ts
 *
 * 생성하는 엣지:
 * 1. 부수 소속 (part_of, weight 1.0) — 한자 → 부수 한자
 * 2. 구성요소 (part_of, weight 0.8) — 한자 → 구성요소 한자
 * 3. 동음 (related_to, weight 0.5) — 같은 한글 음
 * 4. 형성자 공유 (derived_from, weight 0.8) — 같은 성부(구성요소) 공유
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// .env.local 로딩
const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface HanjaNode {
  id: string;
  domain_data: {
    type: string;
    char: string;
    radical_char: string;
    is_radical: boolean;
    readings: {
      ko: string[];
    };
    composition?: {
      components: string[];
    };
  };
}

interface EdgeRow {
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  weight: number;
  source: string;
}

const BATCH_SIZE = 500;

async function fetchAllHanjaNodes(): Promise<HanjaNode[]> {
  const all: HanjaNode[] = [];
  let offset = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('data_nodes')
      .select('id, domain_data')
      .eq('domain', 'knowledge')
      .eq('is_admin_node', true)
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    const hanja = data.filter((n: any) => n.domain_data?.type === 'hanja');
    all.push(...(hanja as HanjaNode[]));
    offset += PAGE;

    if (data.length < PAGE) break;
  }

  return all;
}

async function insertEdges(edges: EdgeRow[]) {
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    const batch = edges.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('node_relations')
      .upsert(batch, {
        onConflict: 'source_node_id,target_node_id,relation_type',
        ignoreDuplicates: true,
      });

    if (error) {
      // unique constraint 위반은 스킵
      if (error.code === '23505') {
        skipped += batch.length;
      } else {
        console.error(`  ❌ batch insert 실패: ${error.message.slice(0, 80)}`);
        skipped += batch.length;
      }
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, skipped };
}

async function main() {
  console.log('📖 한자 노드 전체 조회...');
  const nodes = await fetchAllHanjaNodes();
  console.log(`  ${nodes.length}개 한자 노드 로드\n`);

  // 인덱스 구축
  const charToNode = new Map<string, HanjaNode>();
  const readingToNodes = new Map<string, HanjaNode[]>();
  const componentToNodes = new Map<string, HanjaNode[]>();

  for (const n of nodes) {
    const d = n.domain_data;
    charToNode.set(d.char, n);

    // 음별 인덱스 (한글 + 로마자 모두)
    for (const ko of d.readings?.ko || []) {
      if (!ko) continue;
      const key = ko.toLowerCase();
      if (!readingToNodes.has(key)) readingToNodes.set(key, []);
      readingToNodes.get(key)!.push(n);
    }

    // 구성요소별 인덱스
    for (const comp of d.composition?.components || []) {
      if (!componentToNodes.has(comp)) componentToNodes.set(comp, []);
      componentToNodes.get(comp)!.push(n);
    }
  }

  console.log(`  인덱스: ${charToNode.size}자, ${readingToNodes.size}개 음, ${componentToNodes.size}개 구성요소\n`);

  // ========================================
  // 1. 부수 소속 엣지 (한자 → 부수 한자)
  // ========================================
  console.log('🔗 1. 부수 소속 엣지 생성...');
  const radicalEdges: EdgeRow[] = [];

  for (const n of nodes) {
    const d = n.domain_data;
    if (d.is_radical) continue; // 부수 자체는 스킵

    const radicalNode = charToNode.get(d.radical_char);
    if (radicalNode && radicalNode.id !== n.id) {
      radicalEdges.push({
        source_node_id: n.id,
        target_node_id: radicalNode.id,
        relation_type: 'part_of',
        weight: 1.0,
        source: 'sql',
      });
    }
  }

  console.log(`  후보: ${radicalEdges.length}개`);
  const r1 = await insertEdges(radicalEdges);
  console.log(`  삽입: ${r1.inserted}, 스킵: ${r1.skipped}\n`);

  // ========================================
  // 2. 구성요소 엣지 (한자 → 구성요소 한자)
  // ========================================
  console.log('🔗 2. 구성요소 엣지 생성...');
  const compEdges: EdgeRow[] = [];

  for (const n of nodes) {
    const d = n.domain_data;
    for (const comp of d.composition?.components || []) {
      const compNode = charToNode.get(comp);
      if (compNode && compNode.id !== n.id) {
        // 부수 엣지와 중복 방지 (같은 source→target, 같은 relation_type)
        const isDuplicate = d.radical_char === comp;
        if (!isDuplicate) {
          compEdges.push({
            source_node_id: n.id,
            target_node_id: compNode.id,
            relation_type: 'part_of',
            weight: 0.8,
            source: 'sql',
          });
        }
      }
    }
  }

  console.log(`  후보: ${compEdges.length}개`);
  const r2 = await insertEdges(compEdges);
  console.log(`  삽입: ${r2.inserted}, 스킵: ${r2.skipped}\n`);

  // ========================================
  // 3. 동음 엣지 (같은 음 한자끼리)
  // ========================================
  console.log('🔗 3. 동음 엣지 생성...');
  const readingEdges: EdgeRow[] = [];

  for (const [reading, group] of Array.from(readingToNodes.entries())) {
    if (group.length < 2 || group.length > 100) continue; // 너무 큰 그룹 스킵

    // 그룹 내 모든 쌍 연결 (단, 최대 20개 노드까지만)
    const limited = group.slice(0, 20);
    for (let i = 0; i < limited.length; i++) {
      for (let j = i + 1; j < limited.length; j++) {
        readingEdges.push({
          source_node_id: limited[i].id,
          target_node_id: limited[j].id,
          relation_type: 'related_to',
          weight: 0.5,
          source: 'sql',
        });
      }
    }
  }

  console.log(`  후보: ${readingEdges.length}개`);
  const r3 = await insertEdges(readingEdges);
  console.log(`  삽입: ${r3.inserted}, 스킵: ${r3.skipped}\n`);

  // ========================================
  // 4. 형성자 공유 엣지 (같은 구성요소 공유)
  // ========================================
  console.log('🔗 4. 형성자 공유 엣지 생성...');
  const phoneticEdges: EdgeRow[] = [];

  for (const [comp, group] of Array.from(componentToNodes.entries())) {
    if (group.length < 2 || group.length > 50) continue;

    const limited = group.slice(0, 15);
    for (let i = 0; i < limited.length; i++) {
      for (let j = i + 1; j < limited.length; j++) {
        phoneticEdges.push({
          source_node_id: limited[i].id,
          target_node_id: limited[j].id,
          relation_type: 'derived_from',
          weight: 0.8,
          source: 'sql',
        });
      }
    }
  }

  console.log(`  후보: ${phoneticEdges.length}개`);
  const r4 = await insertEdges(phoneticEdges);
  console.log(`  삽입: ${r4.inserted}, 스킵: ${r4.skipped}\n`);

  // ========================================
  // 최종 통계
  // ========================================
  const { count } = await supabase
    .from('node_relations')
    .select('*', { count: 'exact', head: true });

  console.log('📊 최종 결과:');
  console.log(`  부수 소속: ${r1.inserted}개`);
  console.log(`  구성요소: ${r2.inserted}개`);
  console.log(`  동음: ${r3.inserted}개`);
  console.log(`  형성자 공유: ${r4.inserted}개`);
  console.log(`  총 엣지 수 (DB): ${count}개`);
}

main().catch(console.error);
