/**
 * 한자 LLM 보강 스크립트
 *
 * Usage: npx tsx scripts/enrich-hanja.ts
 *
 * 1. 로마자 음(kKorean) → 한글 변환
 * 2. 훈(뜻) 추가
 * 3. 구성 원리 (composition) 생성
 * 4. 한자능력검정시험 급수 매핑
 *
 * Claude Haiku 배치 처리, 50자씩
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// .env.local 직접 로딩
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================
// 타입
// ============================================================

interface HanjaDomainData {
  type: 'hanja';
  char: string;
  unicode: string;
  radical_number: number;
  radical_char: string;
  radical_name_ko: string;
  stroke_count: number;
  additional_strokes: number;
  is_radical: boolean;
  readings: {
    ko: string[];
    ko_hun?: string[];
    cn_pinyin?: string;
    cn_cantonese?: string;
    jp_on?: string;
    jp_kun?: string;
  };
  hangul_reading?: string;
  definition_en?: string;
  grade?: number;
  composition?: {
    type: string;
    components: string[];
    explanation: string;
    mnemonic: string;
  };
}

interface EnrichResult {
  char: string;
  readings_ko: string[];     // 한글 음 (예: ['휴'])
  ko_hun: string[];           // 한글 훈 (예: ['쉴'])
  grade: number | null;       // 급수 (8~1, 특급=0) 또는 null
  composition: {
    type: string;             // 상형/지사/회의/형성/전주/가차
    components: string[];
    explanation: string;
    mnemonic: string;
  } | null;
}

// ============================================================
// LLM 호출
// ============================================================

const SYSTEM_PROMPT = `당신은 한자학 전문가입니다. 주어진 한자 목록에 대해 정확한 정보를 JSON으로 반환합니다.

규칙:
1. readings_ko: 한글 음을 배열로. 한 글자에 음이 여러 개면 모두 포함. 로마자가 주어지면 한글로 변환.
2. ko_hun: 한글 훈(뜻)을 배열로. 대표 훈 1~2개.
3. grade: 한자능력검정시험 급수. 8급=8, 7급II=72, 7급=7, 6급II=62, 6급=6, 5급II=52, 5급=5, 4급II=42, 4급=4, 3급II=32, 3급=3, 2급=2, 1급=1, 특급=0. 모르면 null.
4. composition: 구성 원리.
   - type: "상형", "지사", "회의", "형성", "전주", "가차" 중 하나
   - components: 구성요소 한자 배열
   - explanation: 구성 원리 설명 (한국어, 1~2문장)
   - mnemonic: 암기 도우미 문장 (한국어, 1문장)
   - 구성 원리를 모르면 null

반드시 JSON 배열만 반환. 다른 텍스트 없이.`;

async function enrichBatch(batch: HanjaDomainData[]): Promise<EnrichResult[]> {
  const input = batch.map(h => ({
    char: h.char,
    radical: h.radical_char,
    stroke: h.stroke_count,
    ko_roman: h.readings.ko,
    hangul: h.hangul_reading,
    en_def: h.definition_en,
  }));

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `다음 ${batch.length}개 한자를 보강해주세요:\n\n${JSON.stringify(input, null, 0)}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // JSON 추출 (```json ... ``` 래핑 제거)
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    console.error('  ⚠️ JSON 파싱 실패, 재시도...');
    console.error('  응답:', text.slice(0, 200));
    return [];
  }
}

// ============================================================
// 진행 상황 저장/복원 (중단 시 이어서 실행)
// ============================================================

interface Progress {
  completedChars: Set<string>;
  enrichedData: Map<string, EnrichResult>;
}

function loadProgress(progressPath: string): Progress {
  if (fs.existsSync(progressPath)) {
    const raw = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    return {
      completedChars: new Set(raw.completedChars),
      enrichedData: new Map(Object.entries(raw.enrichedData)),
    };
  }
  return { completedChars: new Set(), enrichedData: new Map() };
}

function saveProgress(progressPath: string, progress: Progress) {
  const raw = {
    completedChars: Array.from(progress.completedChars),
    enrichedData: Object.fromEntries(progress.enrichedData),
  };
  fs.writeFileSync(progressPath, JSON.stringify(raw), 'utf-8');
}

// ============================================================
// 메인
// ============================================================

async function main() {
  const dataDir = path.join(__dirname, 'data');
  const inputPath = path.join(dataDir, 'hanja_parsed.json');
  const outputPath = path.join(dataDir, 'hanja_enriched.json');
  const progressPath = path.join(dataDir, 'enrich_progress.json');

  console.log('📖 파싱된 한자 데이터 로딩...');
  const allHanja: HanjaDomainData[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  // 한국어 읽기가 있는 한자만 우선 보강
  const targetHanja = allHanja.filter(h =>
    h.readings.ko.length > 0 || h.hangul_reading
  );

  console.log(`  전체: ${allHanja.length}개, 보강 대상: ${targetHanja.length}개\n`);

  // 진행 상황 복원
  const progress = loadProgress(progressPath);
  const remaining = targetHanja.filter(h => !progress.completedChars.has(h.char));

  console.log(`  이미 완료: ${progress.completedChars.size}개, 남은: ${remaining.length}개\n`);

  if (remaining.length === 0) {
    console.log('✅ 이미 모든 보강 완료!');
    applyEnrichment(allHanja, progress.enrichedData, outputPath);
    return;
  }

  // 배치 처리
  const BATCH_SIZE = 20;
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = remaining.slice(i, i + BATCH_SIZE);

    process.stdout.write(`  [${batchNum}/${totalBatches}] ${batch[0].char}~${batch[batch.length - 1].char} (${batch.length}자)...`);

    try {
      const results = await enrichBatch(batch);

      for (const result of results) {
        progress.completedChars.add(result.char);
        progress.enrichedData.set(result.char, result);
        successCount++;
      }

      // 반환 안 된 한자도 완료 처리 (다음 실행에서 스킵)
      for (const h of batch) {
        progress.completedChars.add(h.char);
      }

      console.log(` ✅ ${results.length}개 보강`);

      // 10배치마다 진행 상황 저장
      if (batchNum % 10 === 0) {
        saveProgress(progressPath, progress);
        console.log(`  💾 진행 저장 (${progress.completedChars.size}개 완료)`);
      }

      // rate limit 방지
      await sleep(500);

    } catch (error: any) {
      console.log(` ❌ 실패: ${error.message?.slice(0, 80)}`);
      failCount++;

      // rate limit 시 대기
      if (error.status === 429) {
        console.log('  ⏳ Rate limit — 30초 대기...');
        await sleep(30000);
        i -= BATCH_SIZE; // 재시도
      }

      // 10번 연속 실패 시 중단
      if (failCount > 10) {
        console.log('\n❌ 연속 실패 과다 — 중단. 진행 상황 저장됨.');
        saveProgress(progressPath, progress);
        break;
      }
    }
  }

  // 최종 저장
  saveProgress(progressPath, progress);

  console.log(`\n📊 보강 결과:`);
  console.log(`  성공: ${successCount}개`);
  console.log(`  실패: ${failCount}개`);

  // enriched 데이터 적용
  applyEnrichment(allHanja, progress.enrichedData, outputPath);
}

function applyEnrichment(
  allHanja: HanjaDomainData[],
  enrichedData: Map<string, EnrichResult>,
  outputPath: string,
) {
  let applied = 0;

  for (const h of allHanja) {
    const enriched = enrichedData.get(h.char);
    if (!enriched) continue;

    // 한글 음 적용
    if (enriched.readings_ko?.length > 0) {
      h.readings.ko = enriched.readings_ko;
    }

    // 훈 적용
    if (enriched.ko_hun?.length > 0) {
      h.readings.ko_hun = enriched.ko_hun;
    }

    // 급수 적용
    if (enriched.grade !== null && enriched.grade !== undefined) {
      h.grade = enriched.grade;
    }

    // 구성 원리 적용
    if (enriched.composition) {
      h.composition = enriched.composition;
    }

    applied++;
  }

  fs.writeFileSync(outputPath, JSON.stringify(allHanja, null, 2), 'utf-8');
  console.log(`\n✅ ${outputPath} 저장 완료 (${applied}개 보강 적용)`);

  // 샘플 출력
  const samples = allHanja.filter(h => h.composition).slice(0, 5);
  console.log('\n📝 보강 샘플:');
  for (const h of samples) {
    console.log(`  ${h.char} (${h.readings.ko_hun?.join(',')} ${h.readings.ko.join(',')}) ${h.grade ? h.grade + '급' : ''}`);
    if (h.composition) {
      console.log(`    ${h.composition.type}: ${h.composition.components.join('+')} — ${h.composition.mnemonic}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
