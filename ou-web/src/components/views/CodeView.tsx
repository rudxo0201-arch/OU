'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, Text, Group, Box, ActionIcon, ScrollArea, Loader } from '@mantine/core';
import { CaretRight, CaretDown, File, Folder, FolderOpen, FloppyDisk, X } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

// Monaco는 dynamic import (SSR 불가)
let MonacoEditor: any = null;
if (typeof window !== 'undefined') {
  import('@monaco-editor/react').then(m => { MonacoEditor = m.default; });
}

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

interface OpenTab {
  path: string;
  content: string;
  language: string;
  modified: boolean;
}

/** API 모드별 URL 빌더 */
function useApiUrls() {
  const { projectId, isAdminMode } = useDevWorkspaceStore();

  if (isAdminMode || !projectId) {
    // Admin 모드: 기존 서버 FS API
    return {
      listFiles: (dirPath: string) =>
        `/api/dev/files?path=${encodeURIComponent(dirPath)}`,
      readFile: (filePath: string) =>
        `/api/dev/file?path=${encodeURIComponent(filePath)}`,
      saveFile: '/api/dev/file',
      saveBody: (path: string, content: string) =>
        JSON.stringify({ path, content }),
    };
  }

  // R2 모드: 프로젝트 API
  return {
    listFiles: (dirPath: string) =>
      `/api/dev/projects/${projectId}/files?path=${encodeURIComponent(dirPath)}`,
    readFile: (filePath: string) =>
      `/api/dev/projects/${projectId}/files?mode=content&path=${encodeURIComponent(filePath)}`,
    saveFile: `/api/dev/projects/${projectId}/files`,
    saveBody: (path: string, content: string) =>
      JSON.stringify({ path, content }),
  };
}

// ── 파일 트리 노드 ──
function FileTreeNode({ item, onFileClick, listFilesUrl, depth = 0 }: {
  item: FileItem;
  onFileClick: (path: string) => void;
  listFilesUrl: (dirPath: string) => string;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChildren = useCallback(async () => {
    if (children.length > 0) { setExpanded(!expanded); return; }
    setLoading(true);
    try {
      const res = await fetch(listFilesUrl(item.path));
      const data = await res.json();
      setChildren(data.items || []);
      setExpanded(true);
    } catch { /* ignore */ }
    setLoading(false);
  }, [item.path, children.length, expanded, listFilesUrl]);

  if (item.type === 'directory') {
    return (
      <Box>
        <Group
          gap={4}
          p={2}
          pl={depth * 16 + 4}
          style={{ cursor: 'pointer', borderRadius: 4 }}
          className="hover-bg"
          onClick={loadChildren}
          wrap="nowrap"
        >
          {loading ? <Loader size={10} /> : expanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
          {expanded ? <FolderOpen size={14} color="var(--mantine-color-yellow-5)" /> : <Folder size={14} color="var(--mantine-color-yellow-5)" />}
          <Text fz={11} truncate="end">{item.name}</Text>
        </Group>
        {expanded && children.map(child => (
          <FileTreeNode key={child.path} item={child} onFileClick={onFileClick} listFilesUrl={listFilesUrl} depth={depth + 1} />
        ))}
      </Box>
    );
  }

  return (
    <Group
      gap={4}
      p={2}
      pl={depth * 16 + 4}
      style={{ cursor: 'pointer', borderRadius: 4 }}
      className="hover-bg"
      onClick={() => onFileClick(item.path)}
      wrap="nowrap"
    >
      <Box w={10} />
      <File size={14} color="var(--mantine-color-blue-4)" />
      <Text fz={11} truncate="end">{item.name}</Text>
    </Group>
  );
}

// ── 메인 CodeView ──
export function CodeView({ nodes }: ViewProps) {
  const [rootItems, setRootItems] = useState<FileItem[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTabLocal] = useState<string | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<any>(null);

  const wsStore = useDevWorkspaceStore();
  const api = useApiUrls();

  const setActiveTab = useCallback((path: string | null) => {
    setActiveTabLocal(path);
    wsStore.setActiveFilePath(path);
  }, [wsStore]);

  // Monaco lazy load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@monaco-editor/react').then(m => {
        MonacoEditor = m.default;
        setEditorReady(true);
      });
    }
  }, []);

  // 루트 디렉토리 로드 (프로젝트 변경 시 재로드)
  useEffect(() => {
    fetch(api.listFiles(''))
      .then(r => r.json())
      .then(d => setRootItems(d.items || []))
      .catch(() => {});
  }, [api.listFiles]);

  // 파일 열기
  const openFile = useCallback(async (filePath: string) => {
    if (tabs.find(t => t.path === filePath)) {
      setActiveTab(filePath);
      return;
    }

    try {
      const res = await fetch(api.readFile(filePath));
      const data = await res.json();
      if (data.content !== undefined) {
        const lang = data.language || 'plaintext';
        const newTab: OpenTab = {
          path: filePath,
          content: data.content,
          language: lang,
          modified: false,
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTab(filePath);
        wsStore.addOpenFile({ path: filePath, language: lang });
      }
    } catch { /* ignore */ }
  }, [tabs, setActiveTab, wsStore, api]);

  // 탭 닫기
  const closeTab = useCallback((filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => prev.filter(t => t.path !== filePath));
    wsStore.removeOpenFile(filePath);
    if (activeTab === filePath) {
      setActiveTab(tabs.length > 1 ? tabs.find(t => t.path !== filePath)?.path ?? null : null);
    }
  }, [activeTab, tabs, setActiveTab, wsStore]);

  // 저장
  const saveFile = useCallback(async () => {
    const tab = tabs.find(t => t.path === activeTab);
    if (!tab || !tab.modified) return;

    try {
      await fetch(api.saveFile, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: api.saveBody(tab.path, tab.content),
      });
      setTabs(prev => prev.map(t => t.path === activeTab ? { ...t, modified: false } : t));
    } catch { /* ignore */ }
  }, [activeTab, tabs, api]);

  // Monaco onChange
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeTab || value === undefined) return;
    setTabs(prev => prev.map(t =>
      t.path === activeTab ? { ...t, content: value, modified: true } : t
    ));
  }, [activeTab]);

  // 단축키 + 선택 텍스트 감지
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });
    editor.onDidChangeCursorSelection(() => {
      const selection = editor.getModel()?.getValueInRange(editor.getSelection());
      if (selection) wsStore.setSelectedText(selection);
    });
  }, [saveFile, wsStore]);

  const currentTab = tabs.find(t => t.path === activeTab);

  return (
    <Group gap={0} align="stretch" wrap="nowrap" style={{ height: '100%', minHeight: 500 }}>
      {/* 파일 트리 */}
      <Box
        style={{
          width: 220,
          borderRight: '1px solid var(--mantine-color-dark-4)',
          flexShrink: 0,
          overflow: 'auto',
        }}
      >
        <Group gap={4} p="xs" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
          <Folder size={12} />
          <Text fz={10} fw={600} c="dimmed">파일</Text>
        </Group>
        <ScrollArea.Autosize mah={450}>
          <Box p={4}>
            {rootItems.map(item => (
              <FileTreeNode key={item.path} item={item} onFileClick={openFile} listFilesUrl={api.listFiles} />
            ))}
          </Box>
        </ScrollArea.Autosize>
      </Box>

      {/* 에디터 영역 */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* 탭 바 */}
        {tabs.length > 0 && (
          <Group gap={0} style={{ borderBottom: '1px solid var(--mantine-color-dark-4)', flexShrink: 0 }}>
            {tabs.map(tab => {
              const fileName = tab.path.split('/').pop() || tab.path;
              const isActive = tab.path === activeTab;
              return (
                <Group
                  key={tab.path}
                  gap={4}
                  px="sm"
                  py={6}
                  wrap="nowrap"
                  style={{
                    cursor: 'pointer',
                    background: isActive ? 'var(--mantine-color-dark-6)' : 'transparent',
                    borderRight: '1px solid var(--mantine-color-dark-5)',
                  }}
                  onClick={() => setActiveTab(tab.path)}
                >
                  <Text fz={11} fw={isActive ? 500 : 400} c={isActive ? undefined : 'dimmed'}>
                    {tab.modified ? `${fileName} *` : fileName}
                  </Text>
                  <ActionIcon size={14} variant="subtle" color="gray" onClick={(e) => closeTab(tab.path, e)}>
                    <X size={10} />
                  </ActionIcon>
                </Group>
              );
            })}

            {currentTab?.modified && (
              <ActionIcon size="sm" variant="subtle" color="blue" ml="auto" mr="xs" onClick={saveFile}>
                <FloppyDisk size={14} />
              </ActionIcon>
            )}
          </Group>
        )}

        {/* Monaco 에디터 */}
        <Box style={{ flex: 1, minHeight: 0 }}>
          {currentTab && editorReady && MonacoEditor ? (
            <MonacoEditor
              height="100%"
              language={currentTab.language}
              value={currentTab.content}
              theme="vs-dark"
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                tabSize: 2,
              }}
            />
          ) : (
            <Stack align="center" justify="center" h="100%" gap="xs">
              <File size={32} color="var(--mantine-color-dark-3)" />
              <Text fz="sm" c="dimmed">파일을 선택하세요</Text>
            </Stack>
          )}
        </Box>
      </Box>

      <style>{`
        .hover-bg:hover { background: var(--mantine-color-dark-5); }
      `}</style>
    </Group>
  );
}
