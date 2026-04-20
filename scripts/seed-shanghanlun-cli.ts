/**
 * 상한론 DataNode 시딩 CLI
 *
 * Usage:
 *   npx tsx scripts/seed-shanghanlun-cli.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { seedShanghanlunData } from '../src/lib/seed/shanghanlun-seed';

// .env.local 로드
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
  console.log('\n📜 상한론 시딩 시작\n');
  const startTime = Date.now();

  const result = await seedShanghanlunData(supabase);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ 완료 (${elapsed}s)`);
  console.log(`   생성: ${result.created}개`);
  console.log(`   스킵: ${result.skipped}개`);
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
