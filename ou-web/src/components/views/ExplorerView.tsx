'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Box, Text, Stack, Group, ActionIcon, UnstyledButton, ScrollArea,
  TextInput, Badge, Tooltip,
} from '@mantine/core';
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

// ── 타입 ──

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  files: FileNode[];
  count: number;
}

interface FileNode {
  id: string;
  name: string;
  domain: string;
  sourceType: string;
  fileType: string | null;
  date: string;
  size: string;
  raw: any;
}

// ── 아이콘 매핑 ──

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

// ── 폴더 트리 빌드 ──

function buildFolderTree(nodes: any[]): FolderNode {
  const root: FolderNode = { name: '/', path: '/', children: [], files: [], count: 0 };
  const folderMap = new Map<string, FolderNode>();
  folderMap.set('/', root);

  const getOrCreateFolder = (path: string, name: string): FolderNode => {
    if (folderMap.has(path)) return folderMap.get(path)!;
    const folder: FolderNode = { name, path, children: [], files: [], count: 0 };
    folderMap.set(path, folder);

    // 부모에 연결
    const parentPath = path.split('/').slice(0, -1).join('/') || '/';
    const parent = folderMap.get(parentPath) ?? root;
    if (!parent.children.find(c => c.path === path)) {
      parent.children.push(folder);
    }
    return folder;
  };

  for (const n of nodes) {
    const domain = n.domain || '기타';
    const sourceType = n.source_type || 'unknown';

    // 도메인 폴더
    const domainFolder = getOrCreateFolder(`/${domain}`, domain);

    // 소스 타입 서브폴더 (파일이 5개 이상이면)
    const file: FileNode = {
      id: n.id,
      name: n.domain_data?.title || n.raw?.slice(0, 60) || '(제목 없음)',
      domain,
      sourceType,
      fileType: n.source_file_type || null,
      date: n.created_at || '',
      size: estimateSize(n),
      raw: n,
    };

    domainFolder.files.push(file);
    domainFolder.count++;
    root.count++;
  }

  // 파일이 많은 폴더는 소스타입으로 서브폴더 분리
  for (const folder of Array.from(folderMap.values())) {
    if (folder.files.length > 10) {
      const bySource = new Map<string, FileNode[]>();
      for (const f of folder.files) {
        const key = f.sourceType;
        if (!bySource.has(key)) bySource.set(key, []);
        bySource.get(key)!.push(f);
      }
      if (bySource.size > 1) {
        folder.files = [];
        for (const [src, files] of Array.from(bySource.entries())) {
          const subFolder = getOrCreateFolder(`${folder.path}/${src}`, sourceTypeLabel(src));
          subFolder.files = files;
          subFolder.count = files.length;
          if (!folder.children.find(c => c.path === subFolder.path)) {
            folder.children.push(subFolder);
          }
        }
      }
    }
  }

  // 정렬: 폴더 이름순, 파일 날짜순
  const sortTree = (node: FolderNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    node.files.sort((a, b) => (a.date > b.date ? -1 : 1));
    node.children.forEach(sortTree);
  };
  sortTree(root);

  return root;
}

function estimateSize(node: any): string {
  const raw = node.raw || '';
  const text = node.domain_data?.extracted_text || node.domain_data?.content || '';
  const bytes = new Blob([raw + text]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceTypeLabel(src: string): string {
  const labels: Record<string, string> = {
    chat: '대화',
    upload: '업로드',
    manual: '직접 입력',
    mcp: '외부 연동',
    youtube: 'YouTube',
    api: 'API',
  };
  return labels[src] || src;
}

// ── 컴포넌트 ──

export function ExplorerView({ nodes }: ViewProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/']));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDesc, setSortDesc] = useState(true);

  const tree = useMemo(() => buildFolderTree(nodes), [nodes]);

  // 검색 필터
  const matchesSearch = useCallback((file: FileNode) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return file.name.toLowerCase().includes(q) || file.domain.toLowerCase().includes(q);
  }, [searchQuery]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const paths = new Set<string>(['/']);
    const collect = (node: FolderNode) => {
      paths.add(node.path);
      node.children.forEach(collect);
    };
    collect(tree);
    setExpandedPaths(paths);
  }, [tree]);

  if (nodes.length === 0) return null;

  return (
    <Box p="md">
      {/* 상단 툴바 */}
      <Group gap="xs" mb="sm">
        <TextInput
          placeholder="검색..."
          size="xs"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          leftSection={<MagnifyingGlass size={14} />}
          style={{ flex: 1, maxWidth: 240 }}
          styles={{ input: { background: 'transparent', border: '0.5px solid var(--mantine-color-default-border)' } }}
        />
        <Tooltip label={sortDesc ? '최신순' : '오래된순'}>
          <ActionIcon
            variant="subtle" color="gray" size="sm"
            onClick={() => setSortDesc(d => !d)}
          >
            {sortDesc ? <SortDescending size={16} /> : <SortAscending size={16} />}
          </ActionIcon>
        </Tooltip>
        <Text fz="xs" c="dimmed">{nodes.length}개</Text>
      </Group>

      {/* 헤더 */}
      <Group
        px="sm" py={6} mb={2}
        style={{ borderBottom: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <Text fz="xs" c="dimmed" fw={600} style={{ flex: 1 }}>이름</Text>
        <Text fz="xs" c="dimmed" fw={600} w={80} ta="right">크기</Text>
        <Text fz="xs" c="dimmed" fw={600} w={100} ta="right">날짜</Text>
      </Group>

      {/* 트리 */}
      <ScrollArea h={500}>
        <FolderTreeRenderer
          node={tree}
          depth={0}
          expandedPaths={expandedPaths}
          selectedId={selectedId}
          sortDesc={sortDesc}
          searchQuery={searchQuery}
          matchesSearch={matchesSearch}
          onToggle={toggleFolder}
          onSelect={setSelectedId}
          isRoot
        />
      </ScrollArea>
    </Box>
  );
}

// ── 재귀 트리 렌더러 ──

function FolderTreeRenderer({
  node,
  depth,
  expandedPaths,
  selectedId,
  sortDesc,
  searchQuery,
  matchesSearch,
  onToggle,
  onSelect,
  isRoot,
}: {
  node: FolderNode;
  depth: number;
  expandedPaths: Set<string>;
  selectedId: string | null;
  sortDesc: boolean;
  searchQuery: string;
  matchesSearch: (f: FileNode) => boolean;
  onToggle: (path: string) => void;
  onSelect: (id: string) => void;
  isRoot?: boolean;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const filteredFiles = node.files.filter(matchesSearch);
  const sortedFiles = [...filteredFiles].sort((a, b) =>
    sortDesc ? (a.date > b.date ? -1 : 1) : (a.date > b.date ? 1 : -1)
  );

  // 검색 중이면 매칭 없는 빈 폴더 숨기기
  const hasChildren = node.children.length > 0;
  const hasFiles = sortedFiles.length > 0;
  if (searchQuery && !hasFiles && !hasChildren) return null;

  return (
    <>
      {/* 폴더 행 (루트는 표시 안 함) */}
      {!isRoot && (
        <UnstyledButton
          onClick={() => onToggle(node.path)}
          style={{ width: '100%' }}
        >
          <Group
            gap={4}
            px="sm"
            py={4}
            style={{
              paddingLeft: depth * 20 + 8,
              borderRadius: 4,
              '&:hover': { background: 'rgba(255,255,255,0.03)' },
            }}
          >
            {isExpanded
              ? <CaretDown size={12} color="var(--mantine-color-dimmed)" />
              : <CaretRight size={12} color="var(--mantine-color-dimmed)" />
            }
            {isExpanded
              ? <FolderOpen size={16} weight="fill" color="var(--mantine-color-gray-5)" />
              : <FolderSimple size={16} weight="fill" color="var(--mantine-color-gray-5)" />
            }
            <Text fz="sm" fw={500} style={{ flex: 1 }}>{node.name}</Text>
            <Badge size="xs" variant="light" color="gray" mr={4}>
              {node.count}
            </Badge>
            <Text fz="xs" c="dimmed" w={80} ta="right" />
            <Text fz="xs" c="dimmed" w={100} ta="right" />
          </Group>
        </UnstyledButton>
      )}

      {/* 자식 (폴더 + 파일) */}
      {(isRoot || isExpanded) && (
        <>
          {node.children.map(child => (
            <FolderTreeRenderer
              key={child.path}
              node={child}
              depth={isRoot ? depth : depth + 1}
              expandedPaths={expandedPaths}
              selectedId={selectedId}
              sortDesc={sortDesc}
              searchQuery={searchQuery}
              matchesSearch={matchesSearch}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
          {sortedFiles.map(file => (
            <FileRow
              key={file.id}
              file={file}
              depth={isRoot ? depth + 1 : depth + 2}
              isSelected={selectedId === file.id}
              onSelect={onSelect}
            />
          ))}
        </>
      )}
    </>
  );
}

function FileRow({
  file,
  depth,
  isSelected,
  onSelect,
}: {
  file: FileNode;
  depth: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <UnstyledButton
      onClick={() => onSelect(file.id)}
      style={{ width: '100%' }}
    >
      <Group
        gap={4}
        px="sm"
        py={4}
        style={{
          paddingLeft: depth * 20 + 8 + 16, // 16px = 캐럿 공간
          borderRadius: 4,
          background: isSelected ? 'rgba(255,255,255,0.05)' : undefined,
        }}
      >
        {getFileIcon(file)}
        <Text fz="sm" lineClamp={1} style={{ flex: 1 }}>{file.name}</Text>
        <Text fz="xs" c="dimmed" w={80} ta="right">{file.size}</Text>
        <Text fz="xs" c="dimmed" w={100} ta="right">
          {file.date ? dayjs(file.date).format('YY.MM.DD') : '-'}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
