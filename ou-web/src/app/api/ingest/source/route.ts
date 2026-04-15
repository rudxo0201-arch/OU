import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/roles';
import { parseSourceCode, detectLanguage, extractImports } from '@/lib/pipeline/parsers/code-parser';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/ingest/source
 *
 * 프로젝트 소스코드를 DataNode로 인제스트한다.
 * 1 파일 = 1 DataNode (domain: development)
 * 섹션 = 코드 구조 (import, function, class 등)
 * 트리플 = import 관계 (LLM 불필요, 정규식 추출)
 *
 * Body: { directory: string }
 */

// 무시할 패턴
const IGNORE_PATTERNS = [
  'node_modules', '.next', '.git', 'dist', 'build', '.turbo',
  '.vercel', '.env', 'pnpm-lock.yaml', 'package-lock.json',
  'yarn.lock', '.DS_Store', 'thumbs.db', '.cache',
];

const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.css', '.scss',
  '.json',
  '.md', '.mdx',
  '.sql',
  '.py',
  '.go', '.rs',
  '.yaml', '.yml', '.toml',
  '.sh', '.bash', '.zsh',
  '.html', '.htm', '.xml', '.svg',
]);

const MAX_FILE_SIZE = 500_000; // 500KB
const MAX_FILES = 500;

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(p => filePath.includes(`/${p}`) || filePath.includes(`\\${p}`));
}

async function walkDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string) {
    if (files.length >= MAX_FILES) return;

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= MAX_FILES) break;

      const fullPath = path.join(current, entry.name);
      if (shouldIgnore(fullPath)) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ALLOWED_EXTENSIONS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return files;
}

export async function POST(req: NextRequest) {
  // 관리자만
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { directory } = body as { directory: string };

  if (!directory) {
    return NextResponse.json({ error: 'directory required' }, { status: 400 });
  }

  // 디렉토리 존재 확인
  try {
    await fs.access(directory);
  } catch {
    return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
  }

  // 파일 목록 수집
  const filePaths = await walkDirectory(directory);

  // 기존 인제스트된 파일 확인 (중복 방지)
  const { data: existingNodes } = await supabase
    .from('data_nodes')
    .select('id, domain_data')
    .eq('user_id', user.id)
    .eq('source_type', 'dev_tool')
    .like('raw', 'source:%');

  const existingPaths = new Set(
    (existingNodes ?? [])
      .map(n => (n.domain_data as any)?.file_path)
      .filter(Boolean)
  );

  const results = {
    total: filePaths.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    triples: 0,
  };

  // 파일별 처리
  for (const filePath of filePaths) {
    const relativePath = path.relative(directory, filePath);

    try {
      const stat = await fs.stat(filePath);
      if (stat.size > MAX_FILE_SIZE) {
        results.skipped++;
        continue;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const language = detectLanguage(filePath);
      const sections = parseSourceCode(content, filePath);
      const imports = extractImports(content, filePath);

      // 이미 인제스트된 파일 → 업데이트
      if (existingPaths.has(relativePath)) {
        const existingNode = existingNodes?.find(
          n => (n.domain_data as any)?.file_path === relativePath
        );
        if (existingNode) {
          await supabase.from('data_nodes').update({
            raw: `source:${relativePath}`,
            domain_data: {
              file_path: relativePath,
              language,
              size: stat.size,
              last_modified: stat.mtime.toISOString(),
              title: relativePath,
            },
          }).eq('id', existingNode.id);

          // 기존 sections/sentences 삭제 후 재생성
          await supabase.from('sentences').delete().eq('node_id', existingNode.id);
          await supabase.from('sections').delete().eq('node_id', existingNode.id);
          await createSections(supabase, existingNode.id, sections);

          // 기존 트리플 삭제 후 재생성
          await supabase.from('triples').delete().eq('node_id', existingNode.id);
          const tripleCount = await createImportTriples(supabase, existingNode.id, imports, relativePath);
          results.triples += tripleCount;

          results.updated++;
        }
        continue;
      }

      // 새 DataNode 생성
      const { data: node, error } = await supabase.from('data_nodes').insert({
        user_id: user.id,
        domain: 'development',
        raw: `source:${relativePath}`,
        source_type: 'dev_tool',
        confidence: 'high',
        resolution: 'resolved',
        view_hint: 'code',
        visibility: 'private',
        domain_data: {
          file_path: relativePath,
          language,
          size: stat.size,
          last_modified: stat.mtime.toISOString(),
          title: relativePath,
        },
      }).select().single();

      if (error || !node) {
        results.errors++;
        continue;
      }

      // sections + sentences
      await createSections(supabase, node.id, sections);

      // import 트리플 (LLM 불필요)
      const tripleCount = await createImportTriples(supabase, node.id, imports, relativePath);
      results.triples += tripleCount;

      results.created++;
    } catch (e) {
      console.error(`[Ingest/Source] Failed: ${relativePath}`, e);
      results.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    results,
  });
}

// ── 헬퍼 ──

async function createSections(
  supabase: any,
  nodeId: string,
  sections: ReturnType<typeof parseSourceCode>,
) {
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const { data: sec } = await supabase.from('sections').insert({
      node_id: nodeId,
      heading: section.heading,
      order_idx: i,
    }).select().single();

    if (!sec) continue;

    // sentences = 코드 줄
    const sentences = section.sentences.filter(s => s.text.trim().length > 0);
    for (let j = 0; j < sentences.length; j++) {
      await supabase.from('sentences').insert({
        section_id: sec.id,
        node_id: nodeId,
        text: sentences[j].text.slice(0, 2000),
        order_idx: j,
        embed_status: 'pending',
        embed_tier: 'warm', // 소스코드는 warm (임베딩 배치 처리)
      });
    }
  }
}

async function createImportTriples(
  supabase: any,
  nodeId: string,
  imports: ReturnType<typeof extractImports>,
  filePath: string,
): Promise<number> {
  let count = 0;

  for (const imp of imports) {
    // 상대 경로만 트리플로 (외부 패키지 제외)
    if (!imp.to.startsWith('.') && !imp.to.startsWith('@/')) continue;

    await supabase.from('triples').insert({
      node_id: nodeId,
      subject: filePath,
      predicate: 'requires',
      object: imp.to,
      confidence: 'high',
    });
    count++;
  }

  return count;
}
