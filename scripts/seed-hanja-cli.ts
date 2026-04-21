/**
 * 한자 데이터 시딩 CLI 스크립트
 *
 * Usage:
 *   npx tsx scripts/seed-hanja-cli.ts                  # all (전체 ~6,193자)
 *   npx tsx scripts/seed-hanja-cli.ts graded            # 급수 있는 한자만 (~6,158자)
 *   npx tsx scripts/seed-hanja-cli.ts medical           # 한의학 도메인만 (~174자)
 *   npx tsx scripts/seed-hanja-cli.ts all --index       # 시딩 후 인덱스 생성
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { seedHanjaData } from '../src/lib/seed/hanja-seed';
import { createHanjaIndexes } from './add-hanja-indexes';

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
  const args = process.argv.slice(2);
  const scope = (['graded', 'medical', 'all'].includes(args[0]) ? args[0] : 'all') as 'graded' | 'medical' | 'all';
  const shouldIndex = args.includes('--index');

  console.log(`\n🔤 한자 시딩 시작 (scope: ${scope})\n`);

  const startTime = Date.now();
  const result = await seedHanjaData(supabase, scope);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n✅ 시딩 완료 (${elapsed}s)`);
  console.log(`   생성: ${result.created}개`);
  console.log(`   스킵: ${result.skipped}개`);

  if (shouldIndex) {
    console.log(`\n📊 인덱스 생성 중...\n`);
    const indexResult = await createHanjaIndexes(supabase);
    console.log(`\n✅ 인덱스 완료: ${indexResult.created} 성공, ${indexResult.failed} 실패`);
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
