'use client';

import { useState, useMemo } from 'react';
import type { ViewProps } from './registry';

/**
 * 스크랩 뷰
 * 참고: Pocket, Raindrop.io, Pinterest
 * - 수집한 영상/링크/자료 카드 갤러리
 * - 소스 타입별 필터 (youtube, file, chat)
 * - 썸네일 + 제목 + 메타
 */

function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function ScrapView({ nodes }: ViewProps) {
  const [filter, setFilter] = useState<string>('all');

  const scraps = useMemo(() =>
    nodes
      .filter(n => n.domain === 'media' || n.source_type === 'youtube' || n.source_type === 'file' || n.domain === 'education')
      .map(n => ({
        id: n.id,
        title: n.domain_data?.title || (n.raw ?? '').slice(0, 50) || '스크랩',
        type: n.domain_data?.video_id ? 'video' as const
          : n.source_type === 'file' ? 'file' as const
          : 'note' as const,
        videoId: n.domain_data?.video_id,
        url: n.domain_data?.url,
        fileName: n.domain_data?.file_name,
        createdAt: n.created_at,
        raw: n.raw,
      })),
  [nodes]);

  const filtered = filter === 'all'
    ? scraps
    : scraps.filter(s => s.type === filter);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of scraps) counts[s.type] = (counts[s.type] || 0) + 1;
    return counts;
  }, [scraps]);

  if (scraps.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
        스크랩이 없습니다. 유튜브 URL이나 파일을 Orb에 보내보세요.
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        <Chip label={`전체 ${scraps.length}`} active={filter === 'all'} onClick={() => setFilter('all')} />
        {typeCounts.video && <Chip label={`영상 ${typeCounts.video}`} active={filter === 'video'} onClick={() => setFilter('video')} />}
        {typeCounts.file && <Chip label={`파일 ${typeCounts.file}`} active={filter === 'file'} onClick={() => setFilter('file')} />}
        {typeCounts.note && <Chip label={`노트 ${typeCounts.note}`} active={filter === 'note'} onClick={() => setFilter('note')} />}
      </div>

      {/* Card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
      }}>
        {filtered.map(scrap => (
          <div key={scrap.id} style={{
            borderRadius: 10,
            border: '0.5px solid var(--ou-border-faint)',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-sm)',
            overflow: 'hidden',
            transition: '150ms ease',
          }}>
            {/* Thumbnail */}
            {scrap.videoId && (
              <div style={{
                width: '100%', aspectRatio: '16/9',
                background: `url(${getYoutubeThumbnail(scrap.videoId)}) center/cover`,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                }}>
                  <span style={{ fontSize: 24, color: 'rgba(0,0,0,0.7)' }}>▶</span>
                </div>
              </div>
            )}

            {!scrap.videoId && (
              <div style={{
                width: '100%', height: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--ou-bg)',
                boxShadow: 'inset var(--ou-neu-pressed-sm)',
                fontSize: 20, color: 'var(--ou-text-disabled)',
              }}>
                {scrap.type === 'file' ? '📄' : '📝'}
              </div>
            )}

            {/* Content */}
            <div style={{ padding: '10px 14px' }}>
              <div style={{
                fontSize: 13, fontWeight: 500,
                color: 'var(--ou-text-heading)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginBottom: 4,
              }}>
                {scrap.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 4,
                  border: '0.5px solid var(--ou-border-faint)',
                  color: 'var(--ou-text-muted)',
                }}>
                  {scrap.type === 'video' ? '영상' : scrap.type === 'file' ? '파일' : '노트'}
                </span>
                {scrap.createdAt && (
                  <span style={{ fontSize: 10, color: 'var(--ou-text-disabled)' }}>
                    {new Date(scrap.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 999, fontSize: 11,
        border: `0.5px solid ${active ? 'var(--ou-border-subtle)' : 'var(--ou-border-faint)'}`,
        background: 'var(--ou-bg)',
        boxShadow: active ? 'var(--ou-neu-pressed-sm)' : 'var(--ou-neu-raised-sm)',
        color: active ? 'var(--ou-text-heading)' : 'var(--ou-text-muted)',
        cursor: 'pointer', transition: '150ms ease',
      }}
    >
      {label}
    </button>
  );
}
