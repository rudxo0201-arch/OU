/**
 * 한자 데이터 → Supabase data_nodes bulk insert
 *
 * Usage: npx tsx scripts/upload-hanja.ts
 *
 * SERVICE_ROLE_KEY 사용 (RLS 우회)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// .env.local 직접 로딩
const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // RLS 우회
);

const BATCH_SIZE = 500;
const ADMIN_EMAIL = 'admin@ouuniverse.com'; // 관리자 이메일 — 필요시 수정

async function getAdminUserId(): Promise<string> {
  // 관리자 프로필 조회
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (error || !data) {
    // 프로필 없으면 첫 번째 사용자를 관리자로 사용
    const { data: first, error: firstErr } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (firstErr || !first) {
      throw new Error('No profiles found. Please create an admin user first.');
    }
    console.log(`  ⚠️ admin@ouuniverse.com 없음. 첫 번째 사용자 사용: ${first.id}`);
    return first.id;
  }

  return data.id;
}

async function main() {
  const dataPath = path.join(__dirname, 'data', 'hanja_enriched.json');

  console.log('📖 enriched 데이터 로딩...');
  const allHanja = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`  총 ${allHanja.length}자\n`);

  // 관리자 ID 조회
  console.log('👤 관리자 ID 조회...');
  const adminId = await getAdminUserId();
  console.log(`  admin_id: ${adminId}\n`);

  // 기존 한자 데이터 확인 (중복 방지)
  const { count: existingCount } = await supabase
    .from('data_nodes')
    .select('*', { count: 'exact', head: true })
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true)
    .contains('domain_data', { type: 'hanja' });

  if (existingCount && existingCount > 0) {
    console.log(`  ⚠️ 이미 ${existingCount}개 한자 노드 존재. 스킵하려면 Ctrl+C.`);
    console.log(`  계속하면 중복 insert됨 (upsert 아님). 3초 대기...\n`);
    await sleep(3000);
  }

  // 배치 insert
  const totalBatches = Math.ceil(allHanja.length / BATCH_SIZE);
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < allHanja.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = allHanja.slice(i, i + BATCH_SIZE);

    const rows = batch.map((h: any) => ({
      user_id: adminId,
      is_admin_node: true,
      domain: 'knowledge' as const,
      source_type: 'manual' as const,
      domain_data: h,
      visibility: 'public' as const,
      confidence: 'high' as const,
    }));

    process.stdout.write(`  [${batchNum}/${totalBatches}] ${batch[0].char}~${batch[batch.length - 1].char} (${batch.length}건)...`);

    const { error } = await supabase
      .from('data_nodes')
      .insert(rows);

    if (error) {
      console.log(` ❌ ${error.message.slice(0, 80)}`);
      failed += batch.length;
    } else {
      console.log(` ✅`);
      inserted += batch.length;
    }
  }

  console.log(`\n📊 결과:`);
  console.log(`  성공: ${inserted}건`);
  console.log(`  실패: ${failed}건`);

  // 검증
  const { count } = await supabase
    .from('data_nodes')
    .select('*', { count: 'exact', head: true })
    .eq('domain', 'knowledge')
    .eq('is_admin_node', true)
    .contains('domain_data', { type: 'hanja' });

  console.log(`  DB 확인: ${count}개 한자 노드`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
