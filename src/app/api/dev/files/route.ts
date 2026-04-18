import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/roles';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = process.env.DEV_PROJECT_ROOT || process.cwd();

const HIDDEN_PATTERNS = [
  /^\.env/,
  /^\.git$/,
  /node_modules/,
  /\.next/,
  /credentials/i,
  /secret/i,
];

function isSafePath(requestedPath: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, requestedPath);
  return resolved.startsWith(PROJECT_ROOT);
}

function isHidden(name: string): boolean {
  return HIDDEN_PATTERNS.some(p => p.test(name));
}

/**
 * GET /api/dev/files?path=src/
 * 디렉토리 목록 반환
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const dirPath = req.nextUrl.searchParams.get('path') || '';

  if (!isSafePath(dirPath)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = path.resolve(PROJECT_ROOT, dirPath);

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const items = entries
      .filter(e => !isHidden(e.name))
      .map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, e.name),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ items, path: dirPath });
  } catch {
    return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
  }
}
