/**
 * 한자 검색 성능을 위한 DB 인덱스 추가
 *
 * Usage: npx tsx scripts/add-hanja-indexes.ts
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

const INDEXES = [
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

async function main() {
  console.log('📊 한자 인덱스 추가...\n');

  for (const idx of INDEXES) {
    process.stdout.write(`  ${idx.name}...`);
    const { error } = await supabase.rpc('exec_sql', { query: idx.sql });

    if (error) {
      // rpc가 없으면 직접 실행 시도
      if (error.message.includes('exec_sql')) {
        console.log(' ⚠️ exec_sql RPC 없음 — Supabase SQL Editor에서 직접 실행 필요');
        break;
      }
      console.log(` ❌ ${error.message.slice(0, 60)}`);
    } else {
      console.log(' ✅');
    }
  }

  console.log('\n만약 RPC가 없다면, 아래 SQL을 Supabase SQL Editor에서 실행하세요:\n');
  console.log('-- ========================================');
  console.log('-- 한자 검색 인덱스');
  console.log('-- ========================================');
  for (const idx of INDEXES) {
    console.log(idx.sql);
  }
}

main().catch(console.error);
