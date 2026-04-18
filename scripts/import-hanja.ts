/**
 * UniHan → OU DataNode 한자 데이터 파싱 스크립트
 *
 * Usage: npx tsx scripts/import-hanja.ts
 *
 * 1단계: UniHan 텍스트 파일 → JSON 변환
 * 2단계: Supabase bulk insert (별도 실행)
 */

import fs from 'fs';
import path from 'path';

// ============================================================
// 214 부수 매핑 (강희자전 부수번호 → 부수 한자)
// ============================================================
const KANGXI_RADICALS: Record<number, { char: string; name_ko: string }> = {
  1: { char: '一', name_ko: '한 일' },
  2: { char: '丨', name_ko: '뚫을 곤' },
  3: { char: '丶', name_ko: '점 주' },
  4: { char: '丿', name_ko: '삐침 별' },
  5: { char: '乙', name_ko: '새 을' },
  6: { char: '亅', name_ko: '갈고리 궐' },
  7: { char: '二', name_ko: '두 이' },
  8: { char: '亠', name_ko: '돼지해머리 두' },
  9: { char: '人', name_ko: '사람 인' },
  10: { char: '儿', name_ko: '어진사람인발 인' },
  11: { char: '入', name_ko: '들 입' },
  12: { char: '八', name_ko: '여덟 팔' },
  13: { char: '冂', name_ko: '멀 경' },
  14: { char: '冖', name_ko: '덮을 멱' },
  15: { char: '冫', name_ko: '이수변 빙' },
  16: { char: '几', name_ko: '안석 궤' },
  17: { char: '凵', name_ko: '위튼입구 감' },
  18: { char: '刀', name_ko: '칼 도' },
  19: { char: '力', name_ko: '힘 력' },
  20: { char: '勹', name_ko: '쌀 포' },
  21: { char: '匕', name_ko: '비수 비' },
  22: { char: '匚', name_ko: '상자 방' },
  23: { char: '匸', name_ko: '감출 혜' },
  24: { char: '十', name_ko: '열 십' },
  25: { char: '卜', name_ko: '점 복' },
  26: { char: '卩', name_ko: '병부 절' },
  27: { char: '厂', name_ko: '민엄호 한' },
  28: { char: '厶', name_ko: '마늘 모' },
  29: { char: '又', name_ko: '또 우' },
  30: { char: '口', name_ko: '입 구' },
  31: { char: '囗', name_ko: '에울 위' },
  32: { char: '土', name_ko: '흙 토' },
  33: { char: '士', name_ko: '선비 사' },
  34: { char: '夂', name_ko: '천천히걸을 치' },
  35: { char: '夊', name_ko: '천천히걸을 수' },
  36: { char: '夕', name_ko: '저녁 석' },
  37: { char: '大', name_ko: '큰 대' },
  38: { char: '女', name_ko: '계집 녀' },
  39: { char: '子', name_ko: '아들 자' },
  40: { char: '宀', name_ko: '갓머리 면' },
  41: { char: '寸', name_ko: '마디 촌' },
  42: { char: '小', name_ko: '작을 소' },
  43: { char: '尢', name_ko: '절름발이 왕' },
  44: { char: '尸', name_ko: '주검 시' },
  45: { char: '屮', name_ko: '싹 철' },
  46: { char: '山', name_ko: '뫼 산' },
  47: { char: '巛', name_ko: '내 천' },
  48: { char: '工', name_ko: '장인 공' },
  49: { char: '己', name_ko: '자기 기' },
  50: { char: '巾', name_ko: '수건 건' },
  51: { char: '干', name_ko: '방패 간' },
  52: { char: '幺', name_ko: '작을 요' },
  53: { char: '广', name_ko: '집 엄' },
  54: { char: '廴', name_ko: '끌 인' },
  55: { char: '廾', name_ko: '두손 공' },
  56: { char: '弋', name_ko: '주살 익' },
  57: { char: '弓', name_ko: '활 궁' },
  58: { char: '彐', name_ko: '돼지머리 계' },
  59: { char: '彡', name_ko: '터럭 삼' },
  60: { char: '彳', name_ko: '조금걸을 척' },
  61: { char: '心', name_ko: '마음 심' },
  62: { char: '戈', name_ko: '창 과' },
  63: { char: '戶', name_ko: '지게 호' },
  64: { char: '手', name_ko: '손 수' },
  65: { char: '支', name_ko: '지탱할 지' },
  66: { char: '攴', name_ko: '칠 복' },
  67: { char: '文', name_ko: '글월 문' },
  68: { char: '斗', name_ko: '말 두' },
  69: { char: '斤', name_ko: '도끼 근' },
  70: { char: '方', name_ko: '모 방' },
  71: { char: '无', name_ko: '없을 무' },
  72: { char: '日', name_ko: '날 일' },
  73: { char: '曰', name_ko: '가로 왈' },
  74: { char: '月', name_ko: '달 월' },
  75: { char: '木', name_ko: '나무 목' },
  76: { char: '欠', name_ko: '하품 흠' },
  77: { char: '止', name_ko: '그칠 지' },
  78: { char: '歹', name_ko: '뼈앙상할 알' },
  79: { char: '殳', name_ko: '몽둥이 수' },
  80: { char: '毋', name_ko: '말 무' },
  81: { char: '比', name_ko: '견줄 비' },
  82: { char: '毛', name_ko: '터럭 모' },
  83: { char: '氏', name_ko: '성씨 씨' },
  84: { char: '气', name_ko: '기운 기' },
  85: { char: '水', name_ko: '물 수' },
  86: { char: '火', name_ko: '불 화' },
  87: { char: '爪', name_ko: '손톱 조' },
  88: { char: '父', name_ko: '아비 부' },
  89: { char: '爻', name_ko: '점괘 효' },
  90: { char: '丬', name_ko: '장수 장' },
  91: { char: '片', name_ko: '조각 편' },
  92: { char: '牙', name_ko: '어금니 아' },
  93: { char: '牛', name_ko: '소 우' },
  94: { char: '犬', name_ko: '개 견' },
  95: { char: '玄', name_ko: '검을 현' },
  96: { char: '玉', name_ko: '구슬 옥' },
  97: { char: '瓜', name_ko: '오이 과' },
  98: { char: '瓦', name_ko: '기와 와' },
  99: { char: '甘', name_ko: '달 감' },
  100: { char: '生', name_ko: '날 생' },
  101: { char: '用', name_ko: '쓸 용' },
  102: { char: '田', name_ko: '밭 전' },
  103: { char: '疋', name_ko: '필 필' },
  104: { char: '疒', name_ko: '병질엄 녁' },
  105: { char: '癶', name_ko: '필발머리 발' },
  106: { char: '白', name_ko: '흰 백' },
  107: { char: '皮', name_ko: '가죽 피' },
  108: { char: '皿', name_ko: '그릇 명' },
  109: { char: '目', name_ko: '눈 목' },
  110: { char: '矛', name_ko: '창 모' },
  111: { char: '矢', name_ko: '화살 시' },
  112: { char: '石', name_ko: '돌 석' },
  113: { char: '示', name_ko: '보일 시' },
  114: { char: '禸', name_ko: '짐승발자국 유' },
  115: { char: '禾', name_ko: '벼 화' },
  116: { char: '穴', name_ko: '구멍 혈' },
  117: { char: '立', name_ko: '설 립' },
  118: { char: '竹', name_ko: '대 죽' },
  119: { char: '米', name_ko: '쌀 미' },
  120: { char: '糸', name_ko: '실 사' },
  121: { char: '缶', name_ko: '장군 부' },
  122: { char: '网', name_ko: '그물 망' },
  123: { char: '羊', name_ko: '양 양' },
  124: { char: '羽', name_ko: '깃 우' },
  125: { char: '老', name_ko: '늙을 로' },
  126: { char: '而', name_ko: '말이을 이' },
  127: { char: '耒', name_ko: '쟁기 뢰' },
  128: { char: '耳', name_ko: '귀 이' },
  129: { char: '聿', name_ko: '붓 율' },
  130: { char: '肉', name_ko: '고기 육' },
  131: { char: '臣', name_ko: '신하 신' },
  132: { char: '自', name_ko: '스스로 자' },
  133: { char: '至', name_ko: '이를 지' },
  134: { char: '臼', name_ko: '절구 구' },
  135: { char: '舌', name_ko: '혀 설' },
  136: { char: '舛', name_ko: '어긋날 천' },
  137: { char: '舟', name_ko: '배 주' },
  138: { char: '艮', name_ko: '그칠 간' },
  139: { char: '色', name_ko: '빛 색' },
  140: { char: '艸', name_ko: '풀 초' },
  141: { char: '虍', name_ko: '범호피 호' },
  142: { char: '虫', name_ko: '벌레 충' },
  143: { char: '血', name_ko: '피 혈' },
  144: { char: '行', name_ko: '다닐 행' },
  145: { char: '衣', name_ko: '옷 의' },
  146: { char: '襾', name_ko: '덮을 아' },
  147: { char: '見', name_ko: '볼 견' },
  148: { char: '角', name_ko: '뿔 각' },
  149: { char: '言', name_ko: '말씀 언' },
  150: { char: '谷', name_ko: '골 곡' },
  151: { char: '豆', name_ko: '콩 두' },
  152: { char: '豕', name_ko: '돼지 시' },
  153: { char: '豸', name_ko: '벌레 치' },
  154: { char: '貝', name_ko: '조개 패' },
  155: { char: '赤', name_ko: '붉을 적' },
  156: { char: '走', name_ko: '달릴 주' },
  157: { char: '足', name_ko: '발 족' },
  158: { char: '身', name_ko: '몸 신' },
  159: { char: '車', name_ko: '수레 차' },
  160: { char: '辛', name_ko: '매울 신' },
  161: { char: '辰', name_ko: '별 진' },
  162: { char: '辵', name_ko: '쉬엄쉬엄갈 착' },
  163: { char: '邑', name_ko: '고을 읍' },
  164: { char: '酉', name_ko: '닭 유' },
  165: { char: '釆', name_ko: '분별할 변' },
  166: { char: '里', name_ko: '마을 리' },
  167: { char: '金', name_ko: '쇠 금' },
  168: { char: '長', name_ko: '긴 장' },
  169: { char: '門', name_ko: '문 문' },
  170: { char: '阜', name_ko: '언덕 부' },
  171: { char: '隶', name_ko: '미칠 이' },
  172: { char: '隹', name_ko: '새 추' },
  173: { char: '雨', name_ko: '비 우' },
  174: { char: '靑', name_ko: '푸를 청' },
  175: { char: '非', name_ko: '아닐 비' },
  176: { char: '面', name_ko: '낯 면' },
  177: { char: '革', name_ko: '가죽 혁' },
  178: { char: '韋', name_ko: '가죽 위' },
  179: { char: '韭', name_ko: '부추 구' },
  180: { char: '音', name_ko: '소리 음' },
  181: { char: '頁', name_ko: '머리 혈' },
  182: { char: '風', name_ko: '바람 풍' },
  183: { char: '飛', name_ko: '날 비' },
  184: { char: '食', name_ko: '먹을 식' },
  185: { char: '首', name_ko: '머리 수' },
  186: { char: '香', name_ko: '향기 향' },
  187: { char: '馬', name_ko: '말 마' },
  188: { char: '骨', name_ko: '뼈 골' },
  189: { char: '高', name_ko: '높을 고' },
  190: { char: '髟', name_ko: '터럭 표' },
  191: { char: '鬥', name_ko: '싸움 투' },
  192: { char: '鬯', name_ko: '울창주 창' },
  193: { char: '鬲', name_ko: '솥 력' },
  194: { char: '鬼', name_ko: '귀신 귀' },
  195: { char: '魚', name_ko: '물고기 어' },
  196: { char: '鳥', name_ko: '새 조' },
  197: { char: '鹵', name_ko: '소금 로' },
  198: { char: '鹿', name_ko: '사슴 록' },
  199: { char: '麥', name_ko: '보리 맥' },
  200: { char: '麻', name_ko: '삼 마' },
  201: { char: '黃', name_ko: '누를 황' },
  202: { char: '黍', name_ko: '기장 서' },
  203: { char: '黑', name_ko: '검을 흑' },
  204: { char: '黹', name_ko: '바느질 치' },
  205: { char: '黽', name_ko: '맹꽁이 맹' },
  206: { char: '鼎', name_ko: '솥 정' },
  207: { char: '鼓', name_ko: '북 고' },
  208: { char: '鼠', name_ko: '쥐 서' },
  209: { char: '鼻', name_ko: '코 비' },
  210: { char: '齊', name_ko: '가지런할 제' },
  211: { char: '齒', name_ko: '이 치' },
  212: { char: '龍', name_ko: '용 룡' },
  213: { char: '龜', name_ko: '거북 귀' },
  214: { char: '龠', name_ko: '피리 약' },
};

// ============================================================
// 한자능력검정시험 급수 매핑 (주요 한자만 — LLM 보강 단계에서 전체 매핑)
// ============================================================
// 8급: 50자, 7급: 150자(누적), 6급: 300자, 5급: 500자,
// 4급: 1000자, 3급: 1817자, 2급: 2355자, 1급: 3500자, 특급: 미정
// → 여기서는 자동 매핑 불가, LLM 보강 단계에서 처리

// ============================================================
// UniHan 파싱
// ============================================================

interface RawHanjaEntry {
  codepoint: string;
  char: string;
  kKorean?: string;
  kDefinition?: string;
  kMandarin?: string;
  kCantonese?: string;
  kJapaneseOn?: string;
  kJapaneseKun?: string;
  kHangul?: string;
  kRSUnicode?: string;      // "9.4" → radical=9, additionalStrokes=4
  kTotalStrokes?: string;
}

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
    ko: string[];       // ['휴']
    ko_hun?: string[];  // ['쉴'] — LLM 보강 단계에서 채움
    cn_pinyin?: string;
    cn_cantonese?: string;
    jp_on?: string;
    jp_kun?: string;
  };
  hangul_reading?: string; // kHangul (표준 한글 읽기)
  definition_en?: string;
  grade?: number;          // 한자능력검정 급수 — LLM 보강 단계
  composition?: {          // LLM 보강 단계에서 채움
    type: string;
    components: string[];
    explanation: string;
    mnemonic: string;
  };
}

function parseUnihanFile(filePath: string): Map<string, Record<string, string>> {
  const data = new Map<string, Record<string, string>>();
  const content = fs.readFileSync(filePath, 'utf-8');

  for (const line of content.split('\n')) {
    if (line.startsWith('#') || line.trim() === '') continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const [codepoint, field, ...valueParts] = parts;
    const value = valueParts.join('\t');

    if (!data.has(codepoint)) {
      data.set(codepoint, {});
    }
    data.get(codepoint)![field] = value;
  }

  return data;
}

function codepointToChar(cp: string): string {
  const num = parseInt(cp.replace('U+', ''), 16);
  return String.fromCodePoint(num);
}

function parseRSUnicode(rs: string): { radicalNumber: number; additionalStrokes: number } {
  // Format: "9.4" or "9'.4" (simplified radical variant)
  const clean = rs.replace("'", '');
  const [radical, strokes] = clean.split('.');
  return {
    radicalNumber: parseInt(radical),
    additionalStrokes: parseInt(strokes),
  };
}

function parseKoreanReading(kKorean?: string, kHangul?: string): string[] {
  if (kHangul) {
    // kHangul format: "휴:0E" — take the hangul part
    return [kHangul.split(':')[0]];
  }
  if (kKorean) {
    // kKorean format: "HYU" or "MAN MWUK" — romanized, needs conversion
    // 로마자 → 한글 변환은 LLM 보강 단계에서 처리
    return kKorean.split(' ');
  }
  return [];
}

// 부수 한자 목록 (is_radical 판별용)
const RADICAL_CHARS = new Set(
  Object.values(KANGXI_RADICALS).map(r => r.char)
);

function buildHanjaData(
  codepoint: string,
  readings: Record<string, string>,
  irgSources: Record<string, string>,
): HanjaDomainData | null {
  const char = codepointToChar(codepoint);
  const rsUnicode = irgSources.kRSUnicode;
  const totalStrokes = irgSources.kTotalStrokes;

  if (!rsUnicode) return null;

  const { radicalNumber, additionalStrokes } = parseRSUnicode(rsUnicode);
  const radical = KANGXI_RADICALS[radicalNumber];

  if (!radical) return null;

  const strokeCount = totalStrokes
    ? parseInt(totalStrokes)
    : radicalNumber + additionalStrokes; // fallback

  const koReadings = parseKoreanReading(readings.kKorean, readings.kHangul);

  return {
    type: 'hanja',
    char,
    unicode: codepoint,
    radical_number: radicalNumber,
    radical_char: radical.char,
    radical_name_ko: radical.name_ko,
    stroke_count: strokeCount,
    additional_strokes: additionalStrokes,
    is_radical: RADICAL_CHARS.has(char),
    readings: {
      ko: koReadings,
      cn_pinyin: readings.kMandarin,
      cn_cantonese: readings.kCantonese,
      jp_on: readings.kJapaneseOn,
      jp_kun: readings.kJapaneseKun,
    },
    hangul_reading: readings.kHangul?.split(':')[0],
    definition_en: readings.kDefinition,
  };
}

// ============================================================
// 메인 실행
// ============================================================

async function main() {
  const dataDir = path.join(__dirname, 'data');

  console.log('📖 UniHan 파일 파싱 중...');

  // 파싱
  const readingsMap = parseUnihanFile(path.join(dataDir, 'Unihan_Readings.txt'));
  const irgSourcesMap = parseUnihanFile(path.join(dataDir, 'Unihan_IRGSources.txt'));

  console.log(`  Readings: ${readingsMap.size}개 코드포인트`);
  console.log(`  IRGSources: ${irgSourcesMap.size}개 코드포인트`);

  // 모든 코드포인트 수집
  const allCodepoints = new Set([
    ...Array.from(readingsMap.keys()),
    ...Array.from(irgSourcesMap.keys()),
  ]);

  console.log(`  전체 유니크 코드포인트: ${allCodepoints.size}개`);

  // 한자 데이터 빌드
  const hanjaList: HanjaDomainData[] = [];
  let skipped = 0;

  for (const cp of Array.from(allCodepoints)) {
    const readings = readingsMap.get(cp) || {};
    const irgSources = irgSourcesMap.get(cp) || {};

    const hanja = buildHanjaData(cp, readings, irgSources);
    if (hanja) {
      hanjaList.push(hanja);
    } else {
      skipped++;
    }
  }

  // 한국어 읽기가 있는 것 우선 정렬
  hanjaList.sort((a, b) => {
    const aHasKo = a.readings.ko.length > 0 ? 0 : 1;
    const bHasKo = b.readings.ko.length > 0 ? 0 : 1;
    if (aHasKo !== bHasKo) return aHasKo - bHasKo;
    return a.stroke_count - b.stroke_count;
  });

  // 통계
  const withKorean = hanjaList.filter(h => h.readings.ko.length > 0);
  const radicals = hanjaList.filter(h => h.is_radical);

  console.log('\n📊 결과 통계:');
  console.log(`  총 한자: ${hanjaList.length}개`);
  console.log(`  한국어 읽기 있음: ${withKorean.length}개`);
  console.log(`  부수인 한자: ${radicals.length}개`);
  console.log(`  스킵됨: ${skipped}개 (부수 정보 없음)`);

  // 부수별 분포
  const radicalDist = new Map<number, number>();
  for (const h of hanjaList) {
    radicalDist.set(h.radical_number, (radicalDist.get(h.radical_number) || 0) + 1);
  }

  // 상위 10개 부수
  const topRadicals = Array.from(radicalDist.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('\n📊 부수별 상위 10:');
  for (const [num, count] of topRadicals) {
    const r = KANGXI_RADICALS[num];
    console.log(`  ${r.char} (${r.name_ko}): ${count}자`);
  }

  // JSON 출력
  const outputPath = path.join(dataDir, 'hanja_parsed.json');
  fs.writeFileSync(outputPath, JSON.stringify(hanjaList, null, 2), 'utf-8');
  console.log(`\n✅ ${outputPath} 저장 완료 (${hanjaList.length}개)`);

  // Supabase insert용 SQL 생성 (data_nodes 테이블)
  const sqlPath = path.join(dataDir, 'hanja_insert.sql');
  const sqlLines: string[] = [
    '-- 한자 DataNode bulk insert',
    '-- Generated by import-hanja.ts',
    '',
    '-- 관리자 user_id (실행 전 수정 필요)',
    "-- SET admin_uid = 'YOUR_ADMIN_UUID';",
    '',
  ];

  // 배치 사이즈 (Supabase limit)
  const BATCH_SIZE = 500;

  for (let i = 0; i < hanjaList.length; i += BATCH_SIZE) {
    const batch = hanjaList.slice(i, i + BATCH_SIZE);
    sqlLines.push(`-- Batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    sqlLines.push('INSERT INTO data_nodes (user_id, is_admin_node, domain, source_type, domain_data, graph_type, visibility) VALUES');

    const values = batch.map((h, idx) => {
      const domainDataStr = JSON.stringify(h).replace(/'/g, "''");
      const comma = idx < batch.length - 1 ? ',' : ';';
      const graphType = h.is_radical ? 'star' : 'planet';
      return `  ('ADMIN_UUID', true, 'knowledge', 'manual', '${domainDataStr}'::jsonb, '${graphType}', 'public')${comma}`;
    });

    sqlLines.push(...values);
    sqlLines.push('');
  }

  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8');
  console.log(`✅ ${sqlPath} 저장 완료 (${Math.ceil(hanjaList.length / BATCH_SIZE)} 배치)`);

  // 샘플 출력
  console.log('\n📝 샘플 (처음 5개):');
  for (const h of hanjaList.slice(0, 5)) {
    console.log(`  ${h.char} | 음: ${h.readings.ko.join(',')} | 부수: ${h.radical_char}(${h.radical_name_ko}) | 획: ${h.stroke_count} | 부수여부: ${h.is_radical}`);
  }
}

main().catch(console.error);
