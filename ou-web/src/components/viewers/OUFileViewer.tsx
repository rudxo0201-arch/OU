'use client';

import { useState } from 'react';
import { FileArrowDown, Globe, Eye } from '@phosphor-icons/react';
import type { OUFile } from '@/lib/ou-format/types';

interface OUFileViewerProps {
  file: OUFile;
  /** 가져오기 완료 후 콜백 */
  onImported?: (result: { nodes: number; views: number }) => void;
}

export function OUFileViewer({ file, onImported }: OUFileViewerProps) {
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const nodeCount = file.nodes?.length ?? 0;
  const viewCount = file.views?.length ?? 0;
  const edgeCount = file.edges?.length ?? 0;

  // 도메인별 그룹
  const domainCounts = file.nodes?.reduce<Record<string, number>>((acc, node) => {
    const d = node.domain || '기타';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {}) ?? {};

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/import/ou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setImported(true);
      alert(`기록 ${data.imported.nodes}개, 보기 ${data.imported.views}개를 가져왔어요.`);
      onImported?.(data.imported);
    } catch {
      alert('가져오기에 실패했어요.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      style={{
        border: '0.5px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '0.5px solid var(--mantine-color-default-border)',
        }}
      >
        <Globe size={14} weight="fill" />
        <span style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 600 }}>
          {file.metadata?.title ?? '.ou 파일'}
        </span>
        <span style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(255,255,255,0.08)',
          color: 'var(--mantine-color-dimmed)',
          marginLeft: 'auto',
        }}>
          v{file.version}
        </span>
      </div>

      {/* 메타데이터 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px' }}>
        {file.metadata?.owner && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>만든이</span>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)' }}>{file.metadata.owner}</span>
          </div>
        )}
        {file.metadata?.created && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>만든 날</span>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)' }}>{new Date(file.metadata.created).toLocaleDateString('ko-KR')}</span>
          </div>
        )}
        {file.metadata?.language && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>언어</span>
            <span style={{ fontSize: 'var(--mantine-font-size-xs)' }}>{file.metadata.language}</span>
          </div>
        )}
      </div>

      {/* 요약 */}
      <div
        style={{ padding: '12px', borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <span style={{ fontSize: 'var(--mantine-font-size-sm)', fontWeight: 500, display: 'block', marginBottom: 8 }}>
          이 파일의 기록 {nodeCount}개, 보기 {viewCount}개
        </span>

        {/* 도메인별 뱃지 */}
        {Object.keys(domainCounts).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {Object.entries(domainCounts).map(([domain, count]) => (
              <span key={domain} style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--mantine-color-dimmed)',
              }}>
                {domain} {count}
              </span>
            ))}
          </div>
        )}

        {edgeCount > 0 && (
          <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>
            연결 {edgeCount}개
          </span>
        )}
      </div>

      {/* 노드 목록 미리보기 */}
      {nodeCount > 0 && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px 12px', maxHeight: 200, overflow: 'auto' }}
        >
          {file.nodes.slice(0, 10).map((node, i) => (
            <div
              key={node.id || i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 6,
                border: '0.5px solid var(--mantine-color-default-border)',
              }}
            >
              <span style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.08)',
                color: 'var(--mantine-color-dimmed)',
                flexShrink: 0,
              }}>
                {node.domain || '기타'}
              </span>
              <span style={{ fontSize: 'var(--mantine-font-size-xs)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.raw?.slice(0, 80) || '(내용 없음)'}
              </span>
            </div>
          ))}
          {nodeCount > 10 && (
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)', textAlign: 'center' }}>
              ...외 {nodeCount - 10}개
            </span>
          )}
        </div>
      )}

      {/* 보기 목록 */}
      {viewCount > 0 && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px 12px', borderTop: '0.5px solid var(--mantine-color-default-border)' }}
        >
          <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)', marginBottom: 2 }}>보기 목록</span>
          {file.views.map((view, i) => (
            <div key={view.id || i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Eye size={12} style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--mantine-font-size-xs)' }}>{view.name}</span>
              <span style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 4,
                border: '1px solid var(--mantine-color-default-border)',
                color: 'var(--mantine-color-dimmed)',
              }}>
                {view.viewType}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 가져오기 버튼 */}
      <div
        style={{ padding: '8px 12px', borderTop: '0.5px solid var(--mantine-color-default-border)' }}
      >
        <button
          onClick={handleImport}
          disabled={imported || importing}
          style={{
            width: '100%',
            padding: '6px 12px',
            fontSize: 'var(--mantine-font-size-xs)',
            border: '0.5px solid var(--mantine-color-default-border)',
            borderRadius: 'var(--mantine-radius-md)',
            background: 'rgba(255,255,255,0.06)',
            cursor: imported || importing ? 'not-allowed' : 'pointer',
            opacity: imported || importing ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            color: 'inherit',
          }}
        >
          <FileArrowDown size={14} />
          {imported ? '가져오기 완료' : importing ? '가져오는 중...' : '내 우주로 가져오기'}
        </button>
      </div>
    </div>
  );
}
