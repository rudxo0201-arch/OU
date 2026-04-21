/**
 * 기존 한자 DataNode 전체 삭제 스크립트
 * Usage: npx tsx scripts/delete-hanja.ts
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

async function main() {
  console.log('🗑️  한자 노드 삭제 시작...\n');

  let totalDeleted = 0;
  const BATCH = 100;

  while (true) {
    // id 목록 조회
    const { data, error: fetchErr } = await supabase
      .from('data_nodes')
      .select('id')
      .eq('is_admin_node', true)
      .eq('domain', 'knowledge')
      .filter('domain_data->>type', 'eq', 'hanja')
      .limit(BATCH);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!data || data.length === 0) break;

    const ids = data.map((r: any) => r.id);

    const { error: delErr } = await supabase
      .from('data_nodes')
      .delete()
      .in('id', ids);

    if (delErr) throw new Error(delErr.message);

    totalDeleted += ids.length;
    console.log(`  삭제: ${totalDeleted}개...`);
  }

  console.log(`\n✅ 완료! 총 ${totalDeleted}개 삭제됨`);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
