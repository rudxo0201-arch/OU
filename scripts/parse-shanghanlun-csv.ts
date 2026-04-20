/**
 * 상한론 CSV → shanghanlun-raw.json 파서
 *
 * CSV 형식 (가변 컬럼):
 *   id, section_main, section_sub, title_raw, title_kor,
 *   [key_symptom1, key_symptom2, ...], [formula1, ...], tag
 *
 * 사용법:
 *   npx tsx scripts/parse-shanghanlun-csv.ts scripts/data/shanghanlun-1-30.csv
 *   npx tsx scripts/parse-shanghanlun-csv.ts scripts/data/shanghanlun-1-30.csv --merge
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ── 방제명 매핑 ─────────────────────────────────────────────────────────────
import bangjeRaw from '../src/data/bangje-raw.json';

const formulaIdByName = new Map<string, string>();
for (const f of bangjeRaw as Array<{ id: string; name: string }>) {
  formulaIdByName.set(f.name, f.id);
}

// ── 처방명 판별 (탕/산/환/음/방/전 으로 끝나는 값) ──────────────────────────
const FORMULA_ENDINGS = ['탕', '산', '환', '음', '방', '전'];

function isFormula(val: string): boolean {
  return FORMULA_ENDINGS.some(end => val.endsWith(end));
}

// ── chapter / section 결정 ───────────────────────────────────────────────────
function getChapterSection(n: number): { chapter: string; section: string } {
  if (n <= 30)  return { chapter: '태양병', section: '태양병 상편' };
  if (n <= 127) return { chapter: '태양병', section: '태양병 중편' };
  if (n <= 178) return { chapter: '태양병', section: '태양병 하편' };
  if (n <= 262) return { chapter: '양명병', section: '양명병편' };
  if (n <= 272) return { chapter: '소양병', section: '소양병편' };
  if (n <= 280) return { chapter: '태음병', section: '태음병편' };
  if (n <= 325) return { chapter: '소음병', section: '소음병편' };
  if (n <= 381) return { chapter: '궐음병', section: '궐음병편' };
  if (n <= 391) return { chapter: '곽란병', section: '곽란병편' };
  if (n <= 393) return { chapter: '음양역', section: '음양역편' };
  return { chapter: '노복', section: '노복편' };
}

// ── ID 생성 ──────────────────────────────────────────────────────────────────
function makeId(n: number): string {
  return `SHL-${String(n).padStart(3, '0')}`;
}

// ── CSV 한 줄 파싱 ────────────────────────────────────────────────────────────
// 컬럼 구조:
//   0: id
//   1: section_main
//   2: section_sub
//   3: title_raw  (한문, 쉼표 없음)
//   4: title_kor  (한국어, 내부 쉼표 가능)
//   5..(n-2): symptoms / formulas 혼재
//   n-1: tag
//
// title_kor 경계 탐지: 한국어 문장은 반드시 "다." 또는 "다"로 끝남.
// 쉼표 분리 후 "다."로 끝나는 토큰까지를 title_kor 범위로 판단.
function parseLine(line: string): ParsedRow | null {
  // 1) 먼저 앞 3개 고정 컬럼 분리
  const firstComma = line.indexOf(',');
  const secondComma = line.indexOf(',', firstComma + 1);
  const thirdComma = line.indexOf(',', secondComma + 1);
  const fourthComma = line.indexOf(',', thirdComma + 1);
  if (firstComma < 0 || secondComma < 0 || thirdComma < 0 || fourthComma < 0) return null;

  const id = parseInt(line.slice(0, firstComma).trim(), 10);
  const section_main = line.slice(firstComma + 1, secondComma).trim();
  const section_sub = line.slice(secondComma + 1, thirdComma).trim();
  const title_raw = line.slice(thirdComma + 1, fourthComma).trim();
  const rest = line.slice(fourthComma + 1); // from title_kor onwards

  // 2) rest를 쉼표로 분리
  const tokens = rest.split(',').map(t => t.trim());

  // 3) title_kor 범위 찾기: "다." 또는 "다"로 끝나는 토큰까지 누적
  let titleKorEnd = 0;
  let titleKor = '';
  for (let i = 0; i < tokens.length; i++) {
    const accumulated = titleKor ? titleKor + ',' + tokens[i] : tokens[i];
    // 현재 토큰이 한국어 문장 종결인지 확인
    if (tokens[i].endsWith('다.') || tokens[i].endsWith('다')) {
      titleKor = accumulated;
      titleKorEnd = i + 1;
      break;
    }
    titleKor = accumulated;
    titleKorEnd = i + 1;
  }

  // 4) 나머지 = 중간 토큰 + 마지막 tag
  const middleAndTag = tokens.slice(titleKorEnd).filter(t => t.length > 0);
  const tag = middleAndTag.length > 0 ? middleAndTag[middleAndTag.length - 1] : '';
  const middle = middleAndTag.slice(0, -1);

  // 5) 중간 토큰을 증상 vs 처방으로 분류
  const keySymptoms: string[] = [];
  const formulaNames: string[] = [];
  for (const val of middle) {
    if (!val) continue;
    if (isFormula(val)) formulaNames.push(val);
    else keySymptoms.push(val);
  }

  // 6) 처방명 → bangje formula_id 매핑
  const relatedFormulas = formulaNames
    .map(name => formulaIdByName.get(name))
    .filter((id): id is string => !!id);

  const { chapter, section } = getChapterSection(id);

  return {
    id: makeId(id),
    article_number: id,
    original_text: title_raw,
    korean_text: '',            // 한글음 — 추후 LLM 배치 생성
    translation: titleKor,
    chapter,
    section,
    related_formulas: relatedFormulas,
    formula_names: formulaNames,  // 원본 처방명 (ID 미매핑 포함)
    key_concepts: keySymptoms,
    syndrome: tag,
    generation_method: 'manual' as const,
  };
}

interface ParsedRow {
  id: string;
  article_number: number;
  original_text: string;
  korean_text: string;
  translation: string;
  chapter: string;
  section: string;
  related_formulas: string[];
  formula_names: string[];
  key_concepts: string[];
  syndrome: string;
  generation_method: 'manual' | 'llm_generated' | 'llm_reviewed';
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
const csvPath = process.argv[2];
const shouldMerge = process.argv.includes('--merge');

if (!csvPath) {
  console.error('Usage: npx tsx scripts/parse-shanghanlun-csv.ts <csv-file> [--merge]');
  process.exit(1);
}

const csvContent = readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');
const dataLines = lines.slice(1); // 헤더 제거

const parsed: ParsedRow[] = [];
for (const line of dataLines) {
  if (!line.trim()) continue;
  const row = parseLine(line);
  if (row) {
    parsed.push(row);
  } else {
    console.warn(`[parse] 파싱 실패: ${line.slice(0, 60)}...`);
  }
}

console.log(`[parse] ${parsed.length}개 조문 파싱 완료`);

// 처방명 매핑 통계
const unmapped = parsed.flatMap(p =>
  p.formula_names.filter(name => !formulaIdByName.has(name))
);
if (unmapped.length > 0) {
  console.log(`[parse] bangje 미매핑 처방명: ${Array.from(new Set(unmapped)).join(', ')}`);
}

const rawJsonPath = join(process.cwd(), 'src/data/shanghanlun-raw.json');

if (shouldMerge) {
  // 기존 데이터와 병합 (기존 데이터 우선, 새 데이터로 누락분 추가)
  const existing: ParsedRow[] = JSON.parse(readFileSync(rawJsonPath, 'utf-8'));
  const existingIds = new Set(existing.map(a => a.article_number));

  const toAdd = parsed.filter(p => !existingIds.has(p.article_number));
  const merged = [...existing, ...toAdd].sort((a, b) => a.article_number - b.article_number);

  writeFileSync(rawJsonPath, JSON.stringify(merged, null, 2));
  console.log(`[merge] 기존 ${existing.length}개 + 신규 ${toAdd.length}개 = 총 ${merged.length}개`);
  console.log(`[merge] 저장: ${rawJsonPath}`);
} else {
  // 파싱 결과만 출력 (확인용)
  const outPath = csvPath.replace('.csv', '-parsed.json');
  writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  console.log(`[parse] 저장: ${outPath}`);
  console.log('[parse] --merge 플래그로 실행하면 shanghanlun-raw.json에 병합됩니다.');
}
