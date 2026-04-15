/**
 * code-parser.ts
 *
 * 소스코드 파일을 ParsedSection[]으로 변환한다.
 * AST 불필요 — 정규식 기반 경량 파싱 (비용 0).
 *
 * 지원: TypeScript/JavaScript, CSS, JSON, Markdown, SQL, Python, Go 등
 */

import type { ParsedSection, ParsedSentence } from '../file-parser';

// ── 언어 감지 ──

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  mjs: 'javascript', cjs: 'javascript',
  css: 'css', scss: 'css',
  json: 'json',
  md: 'markdown', mdx: 'markdown',
  sql: 'sql',
  py: 'python',
  go: 'go',
  rs: 'rust',
  yaml: 'yaml', yml: 'yaml',
  toml: 'toml',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  html: 'html', htm: 'html',
  xml: 'xml', svg: 'xml',
};

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return LANG_MAP[ext] ?? 'plaintext';
}

// ── import 관계 추출 (트리플용) ──

export interface ImportRelation {
  from: string;   // 현재 파일
  to: string;     // import 대상
  raw: string;    // 원본 import 구문
}

export function extractImports(content: string, filePath: string): ImportRelation[] {
  const relations: ImportRelation[] = [];

  // ES import: import X from './Y'
  const esImportRe = /import\s+(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = esImportRe.exec(content)) !== null) {
    relations.push({ from: filePath, to: m[1], raw: m[0] });
  }

  // require: const X = require('./Y')
  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = requireRe.exec(content)) !== null) {
    relations.push({ from: filePath, to: m[1], raw: m[0] });
  }

  // Python: import X / from X import Y
  const pyImportRe = /^(?:from\s+([\w.]+)\s+)?import\s+([\w,\s]+)/gm;
  while ((m = pyImportRe.exec(content)) !== null) {
    const target = m[1] || m[2].split(',')[0].trim();
    relations.push({ from: filePath, to: target, raw: m[0] });
  }

  return relations;
}

// ── 코드 → 섹션 분리 ──

interface CodeBlock {
  heading: string;
  lines: string[];
  type: 'imports' | 'function' | 'class' | 'type' | 'export' | 'config' | 'body';
}

// TypeScript/JavaScript 섹션 분리
function splitTS(lines: string[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let current: CodeBlock | null = null;
  let braceDepth = 0;
  let importLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // import 블록 수집
    if (/^import\s/.test(trimmed) || (importLines.length > 0 && /^['"]|^}/.test(trimmed) && braceDepth === 0)) {
      importLines.push(line);
      // 멀티라인 import
      if (trimmed.includes('{') && !trimmed.includes('}')) {
        braceDepth++;
      }
      if (trimmed.includes('}') && braceDepth > 0) {
        braceDepth--;
      }
      continue;
    }

    // import 블록 완료 → 저장
    if (importLines.length > 0 && !/^import\s/.test(trimmed)) {
      blocks.push({ heading: 'imports', lines: importLines, type: 'imports' });
      importLines = [];
    }

    // 함수/클래스/타입/인터페이스 감지
    const funcMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/);
    const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/);
    const typeMatch = trimmed.match(/^(?:export\s+)?(?:interface|type)\s+(\w+)/);
    const exportMatch = trimmed.match(/^export\s+(?:default\s+)?{/);

    const match = funcMatch || arrowMatch || classMatch || typeMatch;

    if (match) {
      // 이전 블록 저장
      if (current && current.lines.length > 0) {
        blocks.push(current);
      }

      const type = classMatch ? 'class' : typeMatch ? 'type' : 'function';
      current = { heading: match[1], lines: [line], type };

      // 한 줄짜리인 경우
      if (braceDepth === 0 && trimmed.endsWith(';')) {
        blocks.push(current);
        current = null;
        continue;
      }

      // 중괄호 추적 시작
      braceDepth = (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
      if (braceDepth <= 0 && trimmed.includes('{')) {
        // 한 줄 함수
        blocks.push(current);
        current = null;
        braceDepth = 0;
      }
      continue;
    }

    if (exportMatch) {
      if (current && current.lines.length > 0) blocks.push(current);
      current = { heading: 'exports', lines: [line], type: 'export' };
      braceDepth = 1;
      continue;
    }

    // 현재 블록에 줄 추가
    if (current) {
      current.lines.push(line);
      braceDepth += (trimmed.match(/{/g) || []).length;
      braceDepth -= (trimmed.match(/}/g) || []).length;

      if (braceDepth <= 0) {
        blocks.push(current);
        current = null;
        braceDepth = 0;
      }
    } else {
      // 블록 외부 — body로 수집
      if (!current) {
        current = { heading: 'body', lines: [], type: 'body' };
      }
      current.lines.push(line);
    }
  }

  // 남은 import/블록 처리
  if (importLines.length > 0) {
    blocks.push({ heading: 'imports', lines: importLines, type: 'imports' });
  }
  if (current && current.lines.length > 0) {
    blocks.push(current);
  }

  return blocks;
}

// Markdown 섹션 분리
function splitMarkdown(lines: string[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let current: CodeBlock = { heading: '(intro)', lines: [], type: 'body' };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (current.lines.length > 0) blocks.push(current);
      current = { heading: headingMatch[2].trim(), lines: [line], type: 'body' };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) blocks.push(current);
  return blocks;
}

// CSS 섹션 분리
function splitCSS(lines: string[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let current: CodeBlock | null = null;
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (depth === 0 && trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('//')) {
      if (current && current.lines.length > 0) blocks.push(current);
      // 셀렉터를 heading으로
      const selector = trimmed.replace(/\s*\{.*/, '');
      current = { heading: selector || 'rule', lines: [line], type: 'body' };
    } else if (current) {
      current.lines.push(line);
    } else {
      if (!current) current = { heading: '(global)', lines: [], type: 'body' };
      current.lines.push(line);
    }

    depth += (trimmed.match(/{/g) || []).length;
    depth -= (trimmed.match(/}/g) || []).length;

    if (depth <= 0 && current && current.lines.length > 0) {
      blocks.push(current);
      current = null;
      depth = 0;
    }
  }

  if (current && current.lines.length > 0) blocks.push(current);
  return blocks;
}

// JSON — 전체를 하나의 섹션으로
function splitJSON(lines: string[]): CodeBlock[] {
  return [{ heading: '(json)', lines, type: 'config' }];
}

// 범용 분리 (빈 줄 기준)
function splitGeneric(lines: string[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let current: CodeBlock = { heading: 'body', lines: [], type: 'body' };

  for (const line of lines) {
    if (line.trim() === '' && current.lines.length > 0) {
      blocks.push(current);
      current = { heading: 'body', lines: [], type: 'body' };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) blocks.push(current);
  return blocks;
}

// ── 줄 → 문장 변환 ──

function linesToSentences(lines: string[]): ParsedSentence[] {
  // 빈 줄 제거, 각 줄을 하나의 sentence로
  return lines
    .filter(l => l.trim().length > 0)
    .map(l => ({
      text: l,
      pages: [],
      type: 'body' as const,
    }));
}

// ── 메인 함수 ──

export function parseSourceCode(content: string, filePath: string): ParsedSection[] {
  const lang = detectLanguage(filePath);
  const lines = content.split('\n');

  let blocks: CodeBlock[];

  switch (lang) {
    case 'typescript':
    case 'javascript':
      blocks = splitTS(lines);
      break;
    case 'markdown':
      blocks = splitMarkdown(lines);
      break;
    case 'css':
      blocks = splitCSS(lines);
      break;
    case 'json':
      blocks = splitJSON(lines);
      break;
    default:
      blocks = splitGeneric(lines);
      break;
  }

  // 빈 블록 제거 + ParsedSection으로 변환
  return blocks
    .filter(b => b.lines.some(l => l.trim().length > 0))
    .map(b => ({
      heading: b.heading,
      body: b.lines.join('\n'),
      pages: [],
      sentences: linesToSentences(b.lines),
    }));
}
