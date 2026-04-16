'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FolderSimple, FolderOpen, FileText, File, FilePdf,
  Image, Code, MusicNote, VideoCamera, Table,
  CaretRight, CaretDown, MagnifyingGlass,
  SortAscending, SortDescending,
} from '@phosphor-icons/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import type { ViewProps } from './registry';

dayjs.locale('ko');

interface FolderNode { name: string; path: string; children: FolderNode[]; files: FileNode[]; count: number; }
interface FileNode { id: string; name: string; domain: string; sourceType: string; fileType: string | null; date: string; size: string; raw: any; }

function getFileIcon(node: FileNode) {
  const ft = node.fileType?.toLowerCase();
  if (ft === 'pdf') return <FilePdf size={16} weight="light" />;
  if (ft === 'image' || ft === 'png' || ft === 'jpg') return <Image size={16} weight="light" />;
  if (ft === 'code' || node.domain === 'development') return <Code size={16} weight="light" />;
  if (ft === 'audio') return <MusicNote size={16} weight="light" />;
  if (ft === 'video') return <VideoCamera size={16} weight="light" />;
  if (ft === 'csv' || ft === 'xlsx') return <Table size={16} weight="light" />;
  if (node.sourceType === 'chat' || node.sourceType === 'mcp') return <FileText size={16} weight="light" />;
  return <File size={16} weight="light" />;
}

function buildFolderTree(nodes: any[]): FolderNode {
  const root: FolderNode = { name: '/', path: '/', children: [], files: [], count: 0 };
  const folderMap = new Map<string, FolderNode>();
  folderMap.set('/', root);
  const getOrCreateFolder = (path: string, name: string): FolderNode => {
    if (folderMap.has(path)) return folderMap.get(path)!;
    const folder: FolderNode = { name, path, children: [], files: [], count: 0 };
    folderMap.set(path, folder);
    const parentPath = path.split('/').slice(0, -1).join('/') || '/';
    const parent = folderMap.get(parentPath) ?? root;
    if (!parent.children.find(c => c.path === path)) parent.children.push(folder);
    return folder;
  };
  for (const n of nodes) {
    const domain = n.domain || '기타';
    const domainFolder = getOrCreateFolder(`/${domain}`, domain);
    const file: FileNode = { id: n.id, name: n.domain_data?.title || n.raw?.slice(0, 60) || '(제목 없음)', domain, sourceType: n.source_type || 'unknown', fileType: n.source_file_type || null, date: n.created_at || '', size: estimateSize(n), raw: n };
    domainFolder.files.push(file); domainFolder.count++; root.count++;
  }
  for (const folder of Array.from(folderMap.values())) {
    if (folder.files.length > 10) {
      const bySource = new Map<string, FileNode[]>();
      for (const f of folder.files) { if (!bySource.has(f.sourceType)) bySource.set(f.sourceType, []); bySource.get(f.sourceType)!.push(f); }
      if (bySource.size > 1) {
        folder.files = [];
        for (const [src, files] of Array.from(bySource.entries())) {
          const sub = getOrCreateFolder(`${folder.path}/${src}`, sourceTypeLabel(src));
          sub.files = files; sub.count = files.length;
          if (!folder.children.find(c => c.path === sub.path)) folder.children.push(sub);
        }
      }
    }
  }
  const sortTree = (node: FolderNode) => { node.children.sort((a, b) => a.name.localeCompare(b.name, 'ko')); node.files.sort((a, b) => (a.date > b.date ? -1 : 1)); node.children.forEach(sortTree); };
  sortTree(root);
  return root;
}

function estimateSize(node: any): string {
  const raw = node.raw || ''; const text = node.domain_data?.extracted_text || node.domain_data?.content || '';
  const bytes = new Blob([raw + text]).size;
  if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceTypeLabel(src: string): string {
  return ({ chat: '대화', upload: '업로드', manual: '직접 입력', mcp: '외부 연동', youtube: 'YouTube', api: 'API' } as Record<string, string>)[src] || src;
}

export function ExplorerView({ nodes }: ViewProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/']));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDesc, setSortDesc] = useState(true);
  const tree = useMemo(() => buildFolderTree(nodes), [nodes]);
  const matchesSearch = useCallback((file: FileNode) => { if (!searchQuery.trim()) return true; const q = searchQuery.toLowerCase(); return file.name.toLowerCase().includes(q) || file.domain.toLowerCase().includes(q); }, [searchQuery]);
  const toggleFolder = useCallback((path: string) => { setExpandedPaths(prev => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; }); }, []);
  if (nodes.length === 0) return null;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, maxWidth: 240, position: 'relative' }}>
          <MagnifyingGlass size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ou-text-dimmed, #888)' }} />
          <input placeholder="검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '6px 8px 6px 28px', fontSize: 12, border: '0.5px solid var(--ou-border, #333)', borderRadius: 6, background: 'transparent', color: 'inherit', outline: 'none' }} />
        </div>
        <button onClick={() => setSortDesc(d => !d)} title={sortDesc ? '최신순' : '오래된순'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'inherit' }}>
          {sortDesc ? <SortDescending size={16} /> : <SortAscending size={16} />}
        </button>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)' }}>{nodes.length}개</span>
      </div>
      <div style={{ display: 'flex', padding: '6px 12px', marginBottom: 2, borderBottom: '0.5px solid var(--ou-border, #333)' }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', fontWeight: 600, flex: 1 }}>이름</span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', fontWeight: 600, width: 80, textAlign: 'right' }}>크기</span>
        <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', fontWeight: 600, width: 100, textAlign: 'right' }}>날짜</span>
      </div>
      <div style={{ height: 500, overflowY: 'auto' }}>
        <TreeRenderer node={tree} depth={0} expandedPaths={expandedPaths} selectedId={selectedId} sortDesc={sortDesc} searchQuery={searchQuery} matchesSearch={matchesSearch} onToggle={toggleFolder} onSelect={setSelectedId} isRoot />
      </div>
    </div>
  );
}

function TreeRenderer({ node, depth, expandedPaths, selectedId, sortDesc, searchQuery, matchesSearch, onToggle, onSelect, isRoot }: { node: FolderNode; depth: number; expandedPaths: Set<string>; selectedId: string | null; sortDesc: boolean; searchQuery: string; matchesSearch: (f: FileNode) => boolean; onToggle: (path: string) => void; onSelect: (id: string) => void; isRoot?: boolean; }) {
  const isExpanded = expandedPaths.has(node.path);
  const filteredFiles = node.files.filter(matchesSearch);
  const sortedFiles = [...filteredFiles].sort((a, b) => sortDesc ? (a.date > b.date ? -1 : 1) : (a.date > b.date ? 1 : -1));
  if (searchQuery && !sortedFiles.length && !node.children.length) return null;
  return (
    <>
      {!isRoot && (
        <button onClick={() => onToggle(node.path)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 4, padding: '4px 12px', paddingLeft: depth * 20 + 8, alignItems: 'center' }}>
            {isExpanded ? <CaretDown size={12} style={{ color: 'var(--ou-text-dimmed, #888)' }} /> : <CaretRight size={12} style={{ color: 'var(--ou-text-dimmed, #888)' }} />}
            {isExpanded ? <FolderOpen size={16} weight="fill" style={{ color: 'var(--ou-gray-5, #888)' }} /> : <FolderSimple size={16} weight="fill" style={{ color: 'var(--ou-gray-5, #888)' }} />}
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{node.name}</span>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: 'var(--ou-bg-subtle, rgba(255,255,255,0.06))', color: 'var(--ou-text-dimmed, #888)' }}>{node.count}</span>
          </div>
        </button>
      )}
      {(isRoot || isExpanded) && (
        <>
          {node.children.map(child => (<TreeRenderer key={child.path} node={child} depth={isRoot ? depth : depth + 1} expandedPaths={expandedPaths} selectedId={selectedId} sortDesc={sortDesc} searchQuery={searchQuery} matchesSearch={matchesSearch} onToggle={onToggle} onSelect={onSelect} />))}
          {sortedFiles.map(file => (
            <button key={file.id} onClick={() => onSelect(file.id)} style={{ width: '100%', background: selectedId === file.id ? 'rgba(255,255,255,0.05)' : 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 4, padding: '4px 12px', paddingLeft: (isRoot ? depth + 1 : depth + 2) * 20 + 8 + 16, alignItems: 'center' }}>
                {getFileIcon(file)}
                <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', width: 80, textAlign: 'right' }}>{file.size}</span>
                <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed, #888)', width: 100, textAlign: 'right' }}>{file.date ? dayjs(file.date).format('YY.MM.DD') : '-'}</span>
              </div>
            </button>
          ))}
        </>
      )}
    </>
  );
}
