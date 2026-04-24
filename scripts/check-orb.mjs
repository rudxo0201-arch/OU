#!/usr/bin/env node
// Orb 개발 하네스 — pnpm build 시 자동 실행 (prebuild)
// Usage: node scripts/check-orb.mjs              # 전체 자동 검사
//        node scripts/check-orb.mjs <slug>        # 특정 Orb (domain 자동 감지)
//        node scripts/check-orb.mjs <slug> <dom>  # Orb + domain 지정

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [,,argSlug, argDomain] = process.argv;

function read(p) { try { return readFileSync(resolve(ROOT, p), 'utf8'); } catch { return ''; } }
function has(p, s) { return read(p).includes(s); }
function fileOk(p) { return existsSync(resolve(ROOT, p)); }

let errs = 0, warns = 0;
function E(label, ok, hint = '') { ok ? ok_() : fail_(label, hint); function ok_() { process.stdout.write(`  ✅  ${label}\n`); } function fail_(l, h) { process.stdout.write(`  ❌  ${l}${h ? `\n      → ${h}` : ''}\n`); errs++; } }
function W(label, ok, hint = '') { ok ? process.stdout.write(`  ✅  ${label}\n`) : (process.stdout.write(`  ⚠️   ${label}${hint ? `\n      → ${hint} (나중에 추가)` : ''}\n`), warns++); }

// Orbs that render via OrbChat — no standalone route needed
const CHAT_ORBS = new Set(['deep-talk']);
// System orbs — skip grid/dock checks
const SYS_ORBS = new Set(['deep-talk', 'admin', 'time']);

function slugs() {
  return [...read('src/components/orb/registry.ts').matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]);
}
function domains() {
  const m = read('src/lib/pipeline/classifier.ts').match(/VIEW_HINT_MAP[^=]*=\s*\{([^}]+)\}/s);
  if (!m) return [];
  const ALIAS = new Set(['health', 'relationship', 'education']);
  return [...m[1].matchAll(/^\s+(\w+):/mg)].map(m => m[1]).filter(d => !ALIAS.has(d));
}
function orbDomain(slug) {
  const m = read('src/components/orb/registry.ts').match(new RegExp(`slug:\\s*'${slug}'[^}]{0,300}domain:\\s*'([^']+)'`, 's'));
  return m ? m[1] : null;
}

function checkOrb(slug) {
  console.log(`\n  Orb: "${slug}"${SYS_ORBS.has(slug) ? ' (system)' : ''}`);
  E(`orb/registry.ts 등록`, has('src/components/orb/registry.ts', `slug: '${slug}'`),
    `orb/registry.ts ORB_REGISTRY 에 '${slug}' 추가`);
  if (!SYS_ORBS.has(slug)) {
    W(`OrbGrid DEFAULT_ORBS`, has('src/components/home/OrbGrid.tsx', `'${slug}'`),
      `OrbGrid.tsx DEFAULT_ORBS 에 추가`);
    W(`DockBar ORB_ICONS/LABELS`, has('src/components/home/DockBar.tsx', `${slug}:`),
      `DockBar.tsx ORB_ICONS, ORB_LABELS 에 추가`);
  }
  if (!CHAT_ORBS.has(slug)) {
    const standalone = has('src/app/(apps)/orb/[slug]/page.tsx', `${slug}:`);
    if (standalone) {
      E(`Standalone page.tsx 존재`, fileOk(`src/app/(apps)/${slug}/page.tsx`),
        `src/app/(apps)/${slug}/page.tsx 생성`);
    }
  }
}

function checkDomain(domain) {
  if (!domain) return;
  console.log(`\n  Domain: "${domain}"`);
  E(`extraction/domains/${domain}.ts 존재`, fileOk(`src/lib/pipeline/extraction/domains/${domain}.ts`),
    `src/lib/pipeline/extraction/domains/${domain}.ts 생성`);
  E(`extraction/registry.ts 등록`, has('src/lib/pipeline/extraction/registry.ts', `${domain}:`),
    `extraction/registry.ts EXTRACTION_REGISTRY['${domain}'] 추가`);
  E(`classifier.ts VIEW_HINT_MAP 등록`, has('src/lib/pipeline/classifier.ts', `${domain}:`),
    `classifier.ts VIEW_HINT_MAP 과 프롬프트 목록에 '${domain}' 추가`);
  E(`types/index.ts DataNodeDomain 포함`, has('src/types/index.ts', `'${domain}'`),
    `types/index.ts DataNodeDomain 유니온에 | '${domain}' 추가`);
}

function checkGlobals() {
  console.log('\n  전역 안전 검사');
  const es = read('src/lib/pipeline/extraction/registry.ts').length;
  E(`extraction/registry.ts 비어있지 않음 (${es}B)`, es > 100,
    '린터가 파일을 비웠을 가능성 — 복원 후 재빌드');
  const os = read('src/components/orb/registry.ts').length;
  E(`orb/registry.ts 비어있지 않음 (${os}B)`, os > 100,
    '린터가 파일을 비웠을 가능성 — 복원 후 재빌드');
}

console.log('\n🔍  Orb 하네스\n' + '─'.repeat(48));
if (argSlug) {
  checkOrb(argSlug);
  const dom = argDomain ?? orbDomain(argSlug);
  if (dom) checkDomain(dom);
} else {
  const ss = slugs(), ds = domains();
  console.log(`\n  Orb: ${ss.join(', ')}\n  Domain: ${ds.join(', ')}`);
  ss.forEach(checkOrb);
  ds.forEach(checkDomain);
}
checkGlobals();

console.log('\n' + '─'.repeat(48));
if (errs === 0) {
  console.log(`\n🎉  빌드 통과${warns > 0 ? ` (홈 그리드 미노출 ⚠️ ${warns}개)` : ''}\n`);
} else {
  console.log(`\n❌  빌드 중단: 오류 ${errs}개 / 경고 ${warns}개\n    docs/ORB_DEV.md 참고\n`);
  process.exit(1);
}
