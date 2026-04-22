'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNoteStore } from '@/stores/noteStore';

/**
 * /note 인덱스 — 노트 선택 전 상태.
 * 마지막으로 편집한 노트가 있으면 자동으로 열어줌.
 * 없으면 첫 노트 생성 유도.
 */
export function NoteIndexContent() {
  const router = useRouter();
  const { pages, loading, fetchPages, createPage } = useNoteStore();

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    if (!loading && pages.length > 0) {
      // 가장 최근 편집 노트로 자동 이동
      const latest = [...pages].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0];
      router.replace(`/note/${latest.id}`);
    }
  }, [loading, pages, router]);

  const handleCreate = () => {
    router.push('/note/new');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: '60vh',
      }}>
        <span className="ou-spinner" style={{ width: 20, height: 20 }} />
      </div>
    );
  }

  // pages.length > 0일 때는 useEffect에서 redirect 처리되므로 여기선 빈 상태만
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '60vh',
      gap: 20,
      userSelect: 'none',
    }}>
      {/* 아이콘 */}
      <div style={{
        width: 72, height: 72,
        background: 'var(--ou-glass)',
        border: '1px solid var(--ou-glass-border)',
        borderRadius: 'var(--ou-radius-xl)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28,
        backdropFilter: 'var(--ou-blur-light)',
        WebkitBackdropFilter: 'var(--ou-blur-light)',
      }}>
        ✎
      </div>

      <div style={{ textAlign: 'center', maxWidth: 280 }}>
        <div style={{
          fontSize: 17, fontWeight: 600,
          color: 'var(--ou-text-strong)',
          marginBottom: 8,
        }}>
          첫 번째 노트를 만들어보세요
        </div>
        <div style={{ fontSize: 13, color: 'var(--ou-text-muted)', lineHeight: 1.6 }}>
          노트, 문서, 아이디어 — 모든 텍스트를 자유롭게 기록하세요
        </div>
      </div>

      <button
        onClick={handleCreate}
        style={{
          padding: '11px 28px',
          background: 'var(--ou-accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--ou-radius-sm)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'opacity var(--ou-transition-fast)',
          boxShadow: 'var(--ou-accent-glow)',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        새 노트 만들기
      </button>

      <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)' }}>
        또는 좌측 사이드바에서 노트를 선택하세요
      </div>
    </div>
  );
}
