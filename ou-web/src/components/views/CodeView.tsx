'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CaretRight, CaretDown, File, Folder, FolderOpen, FloppyDisk, X } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';

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

function useApiUrls() {
  const { projectId, isAdminMode } = useDevWorkspaceStore();

  if (isAdminMode || !projectId) {
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
      <div>
        <div
          onClick={loadChildren}
          style={{
            display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap',
            padding: 2, paddingLeft: depth * 16 + 4,
            cursor: 'pointer', borderRadius: 4,
          }}
          className="hover-bg"
        >
          {loading ? <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>...</span> : expanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
          {expanded ? <FolderOpen size={14} color="var(--mantine-color-yellow-5, #ffd43b)" /> : <Folder size={14} color="var(--mantine-color-yellow-5, #ffd43b)" />}
          <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        </div>
        {expanded && children.map(child => (
          <FileTreeNode key={child.path} item={child} onFileClick={onFileClick} listFilesUrl={listFilesUrl} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      onClick={() => onFileClick(item.path)}
      style={{
        display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap',
        padding: 2, paddingLeft: depth * 16 + 4,
        cursor: 'pointer', borderRadius: 4,
      }}
      className="hover-bg"
    >
      <div style={{ width: 10 }} />
      <File size={14} color="var(--ou-blue, #42a5f5)" />
      <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
    </div>
  );
}

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@monaco-editor/react').then(m => {
        MonacoEditor = m.default;
        setEditorReady(true);
      });
    }
  }, []);

  useEffect(() => {
    fetch(api.listFiles(''))
      .then(r => r.json())
      .then(d => setRootItems(d.items || []))
      .catch(() => {});
  }, [api.listFiles]);

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

  const closeTab = useCallback((filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => prev.filter(t => t.path !== filePath));
    wsStore.removeOpenFile(filePath);
    if (activeTab === filePath) {
      setActiveTab(tabs.length > 1 ? tabs.find(t => t.path !== filePath)?.path ?? null : null);
    }
  }, [activeTab, tabs, setActiveTab, wsStore]);

  const saveFile = useCallback(async () => {
    const tab = tabs.find(t => t.path === activeTab);
    if (!tab || !tab.modified) return;

    try {
      await fetch(api.saveFile, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: api.saveBody(tab.path, tab.content),
      });

      const { webcontainerInstance, isAdminMode } = wsStore;
      if (!isAdminMode && webcontainerInstance) {
        const { writeContainerFile } = await import('@/lib/dev/webcontainer');
        await writeContainerFile(tab.path, tab.content);
      }

      setTabs(prev => prev.map(t => t.path === activeTab ? { ...t, modified: false } : t));
    } catch { /* ignore */ }
  }, [activeTab, tabs, api, wsStore]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeTab || value === undefined) return;
    setTabs(prev => prev.map(t =>
      t.path === activeTab ? { ...t, content: value, modified: true } : t
    ));
  }, [activeTab]);

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
    <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'nowrap', height: '100%', minHeight: 500 }}>
      {/* File tree */}
      <div
        style={{
          width: 220,
          borderRight: '1px solid var(--ou-border-muted, #333)',
          flexShrink: 0,
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: 8, borderBottom: '1px solid var(--ou-border-muted, #222)' }}>
          <Folder size={12} />
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ou-text-dimmed, #888)' }}>파일</span>
        </div>
        <div style={{ maxHeight: 450, overflow: 'auto' }}>
          <div style={{ padding: 4 }}>
            {rootItems.map(item => (
              <FileTreeNode key={item.path} item={item} onFileClick={openFile} listFilesUrl={api.listFiles} />
            ))}
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Tab bar */}
        {tabs.length > 0 && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--ou-border-muted, #333)', flexShrink: 0 }}>
            {tabs.map(tab => {
              const fileName = tab.path.split('/').pop() || tab.path;
              const isActive = tab.path === activeTab;
              return (
                <div
                  key={tab.path}
                  onClick={() => setActiveTab(tab.path)}
                  style={{
                    display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    background: isActive ? 'var(--ou-bg-subtle, rgba(255,255,255,0.06))' : 'transparent',
                    borderRight: '1px solid var(--ou-border-muted, #222)',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: isActive ? 500 : 400, color: isActive ? undefined : 'var(--ou-text-dimmed, #888)' }}>
                    {tab.modified ? `${fileName} *` : fileName}
                  </span>
                  <button
                    onClick={(e) => closeTab(tab.path, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--ou-text-dimmed, #888)', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}

            {currentTab?.modified && (
              <button
                onClick={saveFile}
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', marginRight: 8, padding: 4, color: 'var(--ou-blue, #42a5f5)', display: 'flex', alignItems: 'center' }}
              >
                <FloppyDisk size={14} />
              </button>
            )}
          </div>
        )}

        {/* Monaco editor */}
        <div style={{ flex: 1, minHeight: 0 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
              <File size={32} color="var(--ou-border-muted, #333)" />
              <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)' }}>파일을 선택하세요</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .hover-bg:hover { background: var(--ou-bg-subtle, rgba(255,255,255,0.04)); }
      `}</style>
    </div>
  );
}
