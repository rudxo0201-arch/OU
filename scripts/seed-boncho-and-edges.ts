/**
 * 본초 시드 + name_chars 매핑 + 한자-본초 엣지 + 한자 간 엣지 생성
 *
 * Usage: npx tsx scripts/seed-boncho-and-edges.ts
 *
 * 1. 본초 DataNode 시드 (504개)
 * 2. name_chars: 본초 한자명 → 한자 노드 매핑
 * 3. 한자-본초 엣지 (involves)
 * 4. 한자 간 엣지: 부수별, 동음, 급수별
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

const BATCH_SIZE = 500;
const ADMIN_EMAIL = 'rudxo0201@gmail.com';

interface EdgeRow {
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  weight: number;
  source: string;
}

async function insertEdges(edges: EdgeRow[]) {
  let inserted = 0;
  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    const batch = edges.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('node_relations')
      .upsert(batch, { onConflict: 'source_node_id,target_node_id,relation_type', ignoreDuplicates: true });
    if (error && error.code !== '23505') {
      console.error(`  ❌ batch error: ${error.message.slice(0, 80)}`);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

async function main() {
  // ─── 0. 관리자 유저 조회 ──────────────────────────
  const { data: authData } = await supabase.auth.admin.listUsers();
  const adminUser = authData?.users?.find(u => u.email === ADMIN_EMAIL);
  if (!adminUser) throw new Error('Admin user not found');
  const adminUserId = adminUser.id;
  console.log(`✅ 관리자: ${adminUser.email} (${adminUserId})\n`);

  // ─── 1. 본초 시드 ────────────────────────────────
  console.log('📦 1. 본초 DataNode 시드...');
  const bonchoRaw = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'boncho-raw.json'), 'utf-8')
  );

  // 기존 본초 노드 확인
  const { data: existingBoncho } = await supabase
    .from('data_nodes')
    .select('id, domain_data')
    .eq('user_id', adminUserId)
    .eq('is_admin_node', true)
    .not('domain_data->herb_id', 'is', null);

  const existingHerbIds = new Set(
    (existingBoncho ?? []).map((n: any) => n.domain_data?.herb_id).filter(Boolean)
  );

  const newHerbs = bonchoRaw.filter((h: any) => h.id && !existingHerbIds.has(h.id));
  console.log(`  기존: ${existingHerbIds.size}개, 신규: ${newHerbs.length}개`);

  if (newHerbs.length > 0) {
    for (let i = 0; i < newHerbs.length; i += 50) {
      const batch = newHerbs.slice(i, i + 50);
      const payload = batch.map((herb: any) => {
        const displayName = herb.hanja ? `${herb.name}(${herb.hanja})` : herb.name;
        const parts = [`${displayName}은(는) ${herb.categoryMinor ?? '미분류'} 소속 본초이다.`];
        if (herb.nature) parts.push(`성(性)은 ${herb.nature.join(', ')}이다.`);
        if (herb.flavor) parts.push(`미(味)는 ${herb.flavor.join(', ')}이다.`);
        if (herb.channelTropism) parts.push(`귀경은 ${herb.channelTropism.join(', ')}이다.`);
        if (herb.efficacy) parts.push(`효능은 ${herb.efficacy.join(', ')}이다.`);
        if (herb.indications) parts.push(`주치는 ${herb.indications.join(', ')}이다.`);

        return {
          user_id: adminUserId,
          domain: 'knowledge',
          raw: parts.join(' '),
          domain_data: {
            _admin_internal: true,
            _visibility_locked: true,
            herb_id: herb.id,
            name_korean: herb.name,
            name_hanja: herb.hanja,
            category_major: herb.categoryMajor,
            category_minor: herb.categoryMinor,
            starred: herb.starred,
            nature: herb.nature,
            flavor: herb.flavor,
            channel_tropism: herb.channelTropism,
            efficacy: herb.efficacy,
            indications: herb.indications,
            enrichment_status: herb.nature ? 'partial' : 'pending',
          },
          visibility: 'public',
          confidence: herb.nature ? 'high' : 'medium',
          source_type: 'manual',
          resolution: 'resolved',
          importance: herb.starred ? 5 : 3,
          is_admin_node: true,
        };
      });

      const { error } = await supabase.from('data_nodes').insert(payload);
      if (error) console.error(`  ❌ boncho batch ${i}: ${error.message.slice(0, 80)}`);
      else process.stdout.write(`  ${Math.min(i + 50, newHerbs.length)}/${newHerbs.length}\r`);
    }
    console.log(`  ✅ 본초 ${newHerbs.length}개 생성 완료\n`);
  } else {
    console.log('  이미 모든 본초 데이터 존재\n');
  }

  // ─── 2. 한자 노드 인덱스 구축 ────────────────────
  console.log('📖 2. 한자 노드 인덱스 구축...');
  const charToId = new Map<string, string>();
  const readingToIds = new Map<string, string[]>();
  const radicalToIds = new Map<string, string[]>();
  const gradeToIds = new Map<number, string[]>();

  let offset = 0;
  const PAGE = 1000;
  let totalHanja = 0;

  while (true) {
    const { data, error } = await supabase
      .from('data_nodes')
      .select('id, domain_data')
      .eq('is_admin_node', true)
      .range(offset, offset + PAGE - 1);

    if (error || !data || data.length === 0) break;

    for (const n of data) {
      const dd = n.domain_data;
      if (!dd || dd.type !== 'hanja') continue;
      totalHanja++;

      charToId.set(dd.char, n.id);

      // 음별 인덱스
      for (const ko of dd.readings?.ko || []) {
        if (!ko) continue;
        const key = ko.toLowerCase();
        if (!readingToIds.has(key)) readingToIds.set(key, []);
        readingToIds.get(key)!.push(n.id);
      }

      // 부수별 인덱스
      if (dd.radical_char) {
        if (!radicalToIds.has(dd.radical_char)) radicalToIds.set(dd.radical_char, []);
        radicalToIds.get(dd.radical_char)!.push(n.id);
      }

      // 급수별 인덱스
      if (dd.grade) {
        if (!gradeToIds.has(dd.grade)) gradeToIds.set(dd.grade, []);
        gradeToIds.get(dd.grade)!.push(n.id);
      }
    }

    offset += PAGE;
    if (data.length < PAGE) break;
  }

  console.log(`  ${totalHanja}자, ${readingToIds.size}개 음, ${radicalToIds.size}개 부수, ${gradeToIds.size}개 급수\n`);

  // ─── 3. 본초 name_chars 매핑 + 한자-본초 엣지 ────
  console.log('🔗 3. 본초 name_chars 매핑 + 한자-본초 엣지...');

  // 본초 노드 전체 조회
  const { data: allBoncho } = await supabase
    .from('data_nodes')
    .select('id, domain_data')
    .eq('user_id', adminUserId)
    .eq('is_admin_node', true)
    .not('domain_data->herb_id', 'is', null);

  const herbEdges: EdgeRow[] = [];
  let nameCharsUpdated = 0;

  for (const bNode of allBoncho ?? []) {
    const dd = bNode.domain_data;
    const hanja = dd?.name_hanja;
    if (!hanja) continue;

    // 한자명 분해 → name_chars
    const chars = [...hanja];
    const nameChars: { seq: number; char: string; node_id: string | null }[] = [];

    for (let i = 0; i < chars.length; i++) {
      const nodeId = charToId.get(chars[i]) || null;
      nameChars.push({ seq: i + 1, char: chars[i], node_id: nodeId });

      // 한자 → 본초 엣지
      if (nodeId) {
        herbEdges.push({
          source_node_id: nodeId,
          target_node_id: bNode.id,
          relation_type: 'involves',
          weight: 1.0,
          source: 'sql',
        });
      }
    }

    // domain_data에 name_chars 추가
    const { error } = await supabase
      .from('data_nodes')
      .update({ domain_data: { ...dd, name_chars: nameChars } })
      .eq('id', bNode.id);

    if (!error) nameCharsUpdated++;
  }

  console.log(`  name_chars 업데이트: ${nameCharsUpdated}개`);
  console.log(`  한자-본초 엣지 후보: ${herbEdges.length}개`);
  const herbInserted = await insertEdges(herbEdges);
  console.log(`  ✅ 삽입: ${herbInserted}개\n`);

  // ─── 4. 부수별 엣지 (한자 → 부수 한자) ───────────
  console.log('🔗 4. 부수별 엣지...');
  const radicalEdges: EdgeRow[] = [];

  // 부수 한자 ID 찾기
  for (const [radChar, memberIds] of Array.from(radicalToIds.entries())) {
    const radicalNodeId = charToId.get(radChar);
    if (!radicalNodeId) continue;

    for (const memberId of memberIds) {
      if (memberId === radicalNodeId) continue;
      radicalEdges.push({
        source_node_id: memberId,
        target_node_id: radicalNodeId,
        relation_type: 'part_of',
        weight: 1.0,
        source: 'sql',
      });
    }
  }

  console.log(`  후보: ${radicalEdges.length}개`);
  const radInserted = await insertEdges(radicalEdges);
  console.log(`  ✅ 삽입: ${radInserted}개\n`);

  // ─── 5. 동음 엣지 ────────────────────────────────
  console.log('🔗 5. 동음 엣지...');
  const readingEdges: EdgeRow[] = [];

  for (const [, group] of Array.from(readingToIds.entries())) {
    if (group.length < 2 || group.length > 100) continue;
    // 허브-리프: 첫 번째를 허브로, 나머지 연결
    const hub = group[0];
    for (let i = 1; i < Math.min(group.length, 30); i++) {
      readingEdges.push({
        source_node_id: group[i],
        target_node_id: hub,
        relation_type: 'related_to',
        weight: 0.5,
        source: 'sql',
      });
    }
  }

  console.log(`  후보: ${readingEdges.length}개`);
  const readInserted = await insertEdges(readingEdges);
  console.log(`  ✅ 삽입: ${readInserted}개\n`);

  // ─── 6. 급수별 엣지 ──────────────────────────────
  console.log('🔗 6. 급수별 엣지...');
  const gradeEdges: EdgeRow[] = [];

  for (const [, group] of Array.from(gradeToIds.entries())) {
    if (group.length < 2) continue;
    // 허브-리프
    const hub = group[0];
    for (let i = 1; i < Math.min(group.length, 50); i++) {
      gradeEdges.push({
        source_node_id: group[i],
        target_node_id: hub,
        relation_type: 'example_of',
        weight: 0.3,
        source: 'sql',
      });
    }
  }

  console.log(`  후보: ${gradeEdges.length}개`);
  const gradeInserted = await insertEdges(gradeEdges);
  console.log(`  ✅ 삽입: ${gradeInserted}개\n`);

  // ─── 최종 통계 ────────────────────────────────────
  const { count } = await supabase
    .from('node_relations')
    .select('*', { count: 'exact', head: true });

  console.log('📊 최종 결과:');
  console.log(`  한자-본초 엣지: ${herbInserted}개`);
  console.log(`  부수별 엣지: ${radInserted}개`);
  console.log(`  동음 엣지: ${readInserted}개`);
  console.log(`  급수별 엣지: ${gradeInserted}개`);
  console.log(`  총 엣지 수 (DB): ${count}개`);
}

main().catch(console.error);
