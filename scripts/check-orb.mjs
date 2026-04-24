#!/usr/bin/env node
/**
 * Orb 개발 체크리스트 자동 검증
 * Usage: node scripts/check-orb.mjs <slug> [domain]
 *
 * 검사 항목:
 *   - Orb registry 4곳 등록 여부
 *   - 도메인 4파일 등록 여부 (domain 인자 제공 시)
 *   - 라우트 파일 존재 여부
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const [, , slug, domain] = process.argv;

if (!slug) {
  console.error('Usage: node scripts/check-orb.mjs <slug> [domain]');
  process.exit(1);
}

let pass = 0;
let fail = 0;

function check(label, condition, hint = '') {
  if (condition) {
    console.log(`  ✅  ${label}`);
    pass++;
  } else {
    console.log(`  ❌  ${label}${hint ? `\n      → ${hint}` : ''}`);
    fail++;
  }
}

function fileContains(relPath, ...strings) {
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) return false;
  const content = readFileSync(abs, 'utf8');
  return strings.every(s => content.includes(s));
}

function fileExists(relPath) {
  return existsSync(resolve(ROOT, relPath));
}

// ── Orb 등록 검사 ──────────────────────────────────────────────────────
console.log(`\n🔍  Orb 등록 검사: "${slug}"\n`);

check(
  `orb/registry.ts — slug '${slug}' 등록`,
  fileContains('src/components/orb/registry.ts', `slug: '${slug}'`),
  `src/components/orb/registry.ts 에 { slug: '${slug}', ... } 추가`
);

check(
  `OrbGrid.tsx — DEFAULT_ORBS 에 '${slug}' 포함`,
  fileContains('src/components/home/OrbGrid.tsx', `'${slug}'`),
  `src/components/home/OrbGrid.tsx DEFAULT_ORBS 에 { slug: '${slug}', ... } 추가`
);

check(
  `DockBar.tsx — ORB_ICONS 에 '${slug}' 포함`,
  fileContains('src/components/home/DockBar.tsx', `${slug}:`),
  `src/components/home/DockBar.tsx ORB_ICONS, ORB_LABELS 에 '${slug}' 추가`
);

const hasStandalonePage = fileExists(`src/app/(apps)/${slug}/page.tsx`);
const isStandaloneRegistered = fileContains(
  'src/app/(apps)/orb/[slug]/page.tsx',
  `${slug}:`
);

check(
  `Standalone route — /app/(apps)/${slug}/ 또는 STANDALONE_ORBS 등록`,
  hasStandalonePage || isStandaloneRegistered,
  hasStandalonePage
    ? '라우트 있음, STANDALONE_ORBS 등록 확인 필요'
    : `src/app/(apps)/orb/[slug]/page.tsx STANDALONE_ORBS 에 '${slug}: /${slug}' 추가`
);

// ── 도메인 등록 검사 ──────────────────────────────────────────────────
if (domain) {
  console.log(`\n🔍  도메인 등록 검사: "${domain}"\n`);

  check(
    `extraction config — domains/${domain}.ts 파일 존재`,
    fileExists(`src/lib/pipeline/extraction/domains/${domain}.ts`),
    `src/lib/pipeline/extraction/domains/${domain}.ts 생성 필요`
  );

  check(
    `extraction/registry.ts — '${domain}' 등록`,
    fileContains('src/lib/pipeline/extraction/registry.ts', `${domain}:`),
    `extraction/registry.ts 에 import + EXTRACTION_REGISTRY['${domain}'] 추가`
  );

  check(
    `classifier.ts — VIEW_HINT_MAP 에 '${domain}' 포함`,
    fileContains('src/lib/pipeline/classifier.ts', `${domain}:`),
    `classifier.ts VIEW_HINT_MAP 과 프롬프트 도메인 목록에 '${domain}' 추가`
  );

  check(
    `types/index.ts — DataNodeDomain 에 '${domain}' 포함`,
    fileContains('src/types/index.ts', `'${domain}'`),
    `src/types/index.ts DataNodeDomain 유니온에 | '${domain}' 추가`
  );

  // registry.ts 가 비어있지 않은지 추가 확인
  const registryPath = 'src/lib/pipeline/extraction/registry.ts';
  const registryAbs = resolve(ROOT, registryPath);
  if (existsSync(registryAbs)) {
    const size = readFileSync(registryAbs).length;
    check(
      `extraction/registry.ts — 파일이 비어있지 않음 (${size} bytes)`,
      size > 50,
      '린터가 파일을 비울 때 있음. 내용 직접 확인 필요'
    );
  }
}

// ── 결과 ──────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(48)}`);
if (fail === 0) {
  console.log(`\n🎉  모두 통과! (${pass}/${pass + fail})\n`);
} else {
  console.log(`\n⚠️  ${fail}개 항목 누락 (${pass} 통과 / ${fail} 실패)\n`);
  console.log('    docs/ORB_DEV.md 를 참고해서 누락 항목을 추가하세요.\n');
  process.exit(1);
}
