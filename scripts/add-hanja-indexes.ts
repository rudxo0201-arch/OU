/**
 * 한자 검색 성능을 위한 DB 인덱스 추가
 *
 * Usage: npx tsx scripts/add-hanja-indexes.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const HANJA_INDEXES = [
  {
    name: 'idx_hanja_type',
    sql: `CREATE INDEX IF NOT EXISTS idx_hanja_type ON data_nodes ((domain_data->>'type')) WHERE domain_data->>'type' = 'hanja';`,
  },
  {
    name: 'idx_hanja_radical',
    sql: `CREATE INDEX IF NOT EXISTS idx_hanja_radical ON data_nodes ((domain_data->>'radical_char')) WHERE domain_data->>'type' = 'hanja';`,
  },
  {
    name: 'idx_hanja_char',
    sql: `CREATE INDEX IF NOT EXISTS idx_hanja_char ON data_nodes ((domain_data->>'char')) WHERE domain_data->>'type' = 'hanja';`,
  },
  {
    name: 'idx_hanja_stroke',
    sql: `CREATE INDEX IF NOT EXISTS idx_hanja_stroke ON data_nodes (((domain_data->>'stroke_count')::int)) WHERE domain_data->>'type' = 'hanja';`,
  },
  {
    name: 'idx_hanja_grade',
    sql: `CREATE INDEX IF NOT EXISTS idx_hanja_grade ON data_nodes (((domain_data->>'grade')::int)) WHERE domain_data->>'type' = 'hanja' AND domain_data->>'grade' IS NOT NULL;`,
  },
  {
    name: 'idx_hanja_gin',
    sql: `CREATE INDEX IF NOT EXISTS idx_hanja_gin ON data_nodes USING gin (domain_data) WHERE domain_data->>'type' = 'hanja';`,
  },
];

/** 재사용 가능한 인덱스 생성 함수 */
export async function createHanjaIndexes(
  supabase: SupabaseClient,
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  for (const idx of HANJA_INDEXES) {
    process.stdout.write(`  ${idx.name}...`);
    const { error } = await supabase.rpc('exec_sql', { query: idx.sql });

    if (error) {
      if (error.message.includes('exec_sql')) {
        console.log(' ⚠️ exec_sql RPC 없음 — Supabase SQL Editor에서 직접 실행 필요');
        console.log('\n아래 SQL을 Supabase SQL Editor에서 실행하세요:\n');
        for (const i of HANJA_INDEXES) {
          console.log(i.sql);
        }
        failed = HANJA_INDEXES.length;
        break;
      }
      console.log(` ❌ ${error.message.slice(0, 60)}`);
      failed++;
    } else {
      console.log(' ✅');
      created++;
    }
  }

  return { created, failed };
}

// 직접 실행 시
const isDirectRun = require.main === module ||
  process.argv[1]?.endsWith('add-hanja-indexes.ts');

if (isDirectRun) {
  const envPath = path.join(__dirname, '..', '.env.local');
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  console.log('📊 한자 인덱스 추가...\n');
  createHanjaIndexes(supabase).then(result => {
    console.log(`\n완료: ${result.created} 성공, ${result.failed} 실패`);
  }).catch(console.error);
}
