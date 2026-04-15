/**
 * WebContainer 싱글톤 서비스
 * 브라우저 내 Node.js 런타임을 관리한다.
 * @webcontainer/api는 페이지당 하나의 인스턴스만 허용.
 */

import type { WebContainer, WebContainerProcess, FileSystemTree } from '@webcontainer/api';

let instance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/** WebContainer 부팅 (싱글톤) */
export async function bootContainer(): Promise<WebContainer> {
  if (instance) return instance;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    const { WebContainer: WC } = await import('@webcontainer/api');
    instance = await WC.boot();
    return instance;
  })();

  try {
    const result = await bootPromise;
    return result;
  } catch (e) {
    bootPromise = null;
    throw e;
  }
}

/** 현재 인스턴스 반환 */
export function getContainer(): WebContainer | null {
  return instance;
}

/** flat file map → WebContainer FileSystemTree */
export function toFileSystemTree(files: Record<string, string>): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    let current: any = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const dir = parts[i];
      if (!current[dir]) {
        current[dir] = { directory: {} };
      }
      current = current[dir].directory;
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = { file: { contents: content } };
  }

  return tree;
}

/** 프로젝트 파일을 R2에서 가져와 WebContainer에 마운트 */
export async function loadProject(projectId: string): Promise<WebContainer> {
  const container = await bootContainer();

  const res = await fetch(`/api/dev/projects/${projectId}/export`);
  if (!res.ok) throw new Error('Failed to fetch project files');

  const { files } = await res.json() as { files: Record<string, string> };
  const tree = toFileSystemTree(files);
  await container.mount(tree);

  // package.json이 있으면 자동으로 npm install
  try {
    const pkgJson = await container.fs.readFile('package.json', 'utf-8');
    if (pkgJson) {
      const installProcess = await container.spawn('npm', ['install']);
      // install 출력은 무시 (시간이 걸릴 수 있음)
      await installProcess.exit;
    }
  } catch {
    // package.json 없음 → 설치 불필요
  }

  // git init (WebContainer에서 로컬 git 사용 가능하게)
  try {
    const initProcess = await container.spawn('git', ['init']);
    const initCode = await initProcess.exit;
    if (initCode !== 0) throw new Error(`git init exited with ${initCode}`);

    const addProcess = await container.spawn('git', ['add', '.']);
    const addCode = await addProcess.exit;
    if (addCode !== 0) throw new Error(`git add exited with ${addCode}`);

    const commitProcess = await container.spawn('git', [
      'commit', '-m', 'initial', '--allow-empty',
    ]);
    await commitProcess.exit; // commit 실패는 무시 (빈 프로젝트 가능)
  } catch (e) {
    console.warn('[WebContainer] git init failed, continuing without git:', e);
  }

  // server-ready 이벤트 리스닝 (dev server 등이 시작되면 프리뷰 URL 전달)
  container.on('server-ready', (_port: number, url: string) => {
    // Zustand store에 직접 접근 (dynamic import)
    import('@/stores/devWorkspaceStore').then(m => {
      m.useDevWorkspaceStore.getState().setPreviewUrl(url);
    });
  });

  return container;
}

/** 쉘 프로세스 생성 */
export async function spawnShell(): Promise<WebContainerProcess> {
  const container = await bootContainer();
  return container.spawn('jsh', {
    terminal: { cols: 80, rows: 24 },
  });
}

/** WebContainer 파일 쓰기 */
export async function writeContainerFile(path: string, content: string): Promise<void> {
  if (!instance) return;

  // 디렉토리가 없으면 생성
  const parts = path.split('/');
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join('/');
    try {
      const mkdirProcess = await instance.spawn('mkdir', ['-p', dir]);
      await mkdirProcess.exit;
    } catch { /* mkdir might not exist in jsh */ }
  }

  await instance.fs.writeFile(path, content);
}

/** WebContainer 파일 읽기 */
export async function readContainerFile(path: string): Promise<string | null> {
  if (!instance) return null;
  try {
    return await instance.fs.readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

/** WebContainer 종료 */
export function teardown(): void {
  if (instance) {
    instance.teardown();
    instance = null;
    bootPromise = null;
  }
}
