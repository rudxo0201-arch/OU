import type { SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const ADMIN_EMAIL = 'rudxo0201@gmail.com';

type HanjaScope = 'radicals' | 'graded' | 'all';

interface HanjaEntry {
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

/** 32MB JSON을 호출 시점에만 로드 (번들에 포함하지 않음) */
function loadHanjaData(): HanjaEntry[] {
  const filePath = join(process.cwd(), 'scripts/data/hanja_enriched.json');
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function filterByScope(entries: HanjaEntry[], scope: HanjaScope): HanjaEntry[] {
  switch (scope) {
    case 'radicals':
      return entries.filter(e => e.is_radical);
    case 'graded':
      return entries.filter(e => e.grade != null);
    case 'all':
      return entries;
  }
}

/**
 * 한자 DataNode 시드
 * @param scope 'radicals' = 214 부수, 'graded' = 급수 있는 한자 ~1,400, 'all' = 전체 ~98,000
 */
export async function seedHanjaData(
  supabaseAdmin: SupabaseClient,
  scope: HanjaScope = 'graded',
): Promise<{ created: number; skipped: number; adminUserId: string }> {
  // 1. 관리자 유저 조회
  const { data: adminUsers } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1);

  let adminUserId: string | null = adminUsers?.[0]?.id ?? null;

  if (!adminUserId) {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const adminAuth = authData?.users?.find(u => u.email === ADMIN_EMAIL);
    adminUserId = adminAuth?.id ?? null;
  }

  if (!adminUserId) {
    throw new Error(`Admin user not found for email: ${ADMIN_EMAIL}`);
  }

  // 2. 데이터 로드 + scope 필터
  console.log(`[HanjaSeed] Loading hanja_enriched.json...`);
  const allEntries = loadHanjaData();
  const entries = filterByScope(allEntries, scope);
  console.log(`[HanjaSeed] Scope: ${scope}, filtered: ${entries.length} / ${allEntries.length}`);

  // 3. 기존 노드 중복 체크 (char 기준, 페이지네이션)
  const existingChars = new Set<string>();
  let from = 0;
  const FETCH_SIZE = 1000;

  while (true) {
    const { data } = await supabaseAdmin
      .from('data_nodes')
      .select('domain_data')
      .eq('is_admin_node', true)
      .eq('domain', 'knowledge')
      .filter('domain_data->>type', 'eq', 'hanja')
      .range(from, from + FETCH_SIZE - 1);

    if (!data || data.length === 0) break;

    for (const row of data) {
      const char = (row as any).domain_data?.char;
      if (char) existingChars.add(char);
    }

    if (data.length < FETCH_SIZE) break;
    from += FETCH_SIZE;
  }

  console.log(`[HanjaSeed] Existing hanja nodes: ${existingChars.size}`);

  const newEntries = entries.filter(e => !existingChars.has(e.char));

  if (newEntries.length === 0) {
    return { created: 0, skipped: entries.length, adminUserId };
  }

  console.log(`[HanjaSeed] To insert: ${newEntries.length}, to skip: ${entries.length - newEntries.length}`);

  // 4. DataNode 일괄 삽입 (배치 200개씩)
  const BATCH_SIZE = 200;
  let created = 0;

  for (let i = 0; i < newEntries.length; i += BATCH_SIZE) {
    const batch = newEntries.slice(i, i + BATCH_SIZE);

    const insertPayload = batch.map(entry => ({
      user_id: adminUserId,
      domain: 'knowledge',
      raw: buildRawText(entry),
      domain_data: entry,
      visibility: 'public' as const,
      confidence: 'high' as const,
      source_type: 'manual',
      resolution: 'resolved',
      view_hint: 'knowledge_graph',
      is_admin_node: true,
    }));

    const { error } = await supabaseAdmin
      .from('data_nodes')
      .insert(insertPayload);

    if (error) {
      throw new Error(`[HanjaSeed] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
    }

    created += batch.length;

    // 진행률 로그 (10배치마다)
    if (Math.floor(i / BATCH_SIZE) % 10 === 0) {
      console.log(`[HanjaSeed] Progress: ${created}/${newEntries.length}`);
    }
  }

  console.log(`[HanjaSeed] Done. Created: ${created}, Skipped: ${entries.length - newEntries.length}`);

  return {
    created,
    skipped: entries.length - newEntries.length,
    adminUserId,
  };
}

/** 한자 엔트리를 사람이 읽을 수 있는 텍스트로 변환 */
function buildRawText(entry: HanjaEntry): string {
  const parts: string[] = [];

  const readings = entry.readings.ko.length > 0
    ? entry.readings.ko.join(', ')
    : entry.hangul_reading ?? '(미상)';

  parts.push(`${entry.char}은(는) '${readings}'(으)로 읽는 한자이다.`);

  if (entry.definition_en) {
    parts.push(`뜻: ${entry.definition_en}.`);
  }

  parts.push(`부수: ${entry.radical_char}(${entry.radical_name_ko}), 총 ${entry.stroke_count}획.`);

  if (entry.grade) {
    parts.push(`한자능력검정 ${entry.grade}급.`);
  }

  if (entry.composition?.explanation) {
    parts.push(entry.composition.explanation);
  }

  return parts.join(' ');
}
