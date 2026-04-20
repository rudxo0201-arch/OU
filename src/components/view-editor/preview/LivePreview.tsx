'use client';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { RecipePillStrip } from './RecipePillStrip';
import { getSampleNodes } from '../lib/sampleNodes';

// VIEW_REGISTRY에서 동적 import 대신 간단한 렌더러 사용
// 실제 뷰 컴포넌트는 ViewRenderer 통해 렌더링
import dynamic from 'next/dynamic';

const ViewRenderer = dynamic(
  () => import('@/components/views/ViewRenderer').then(m => m.ViewRenderer),
  { ssr: false, loading: () => <p style={{ fontSize: 12, color: 'var(--ou-text-muted)' }}>로딩 중…</p> }
);

export function LivePreview() {
  const { domain, viewType } = useViewEditorStore();

  const sampleNodes = getSampleNodes(domain || undefined, 20);

  return (
    <div style={{
      position: 'sticky', top: 0,
      background: 'var(--ou-bg)', borderRadius: 16,
      boxShadow: 'var(--ou-neu-raised-sm)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      maxHeight: '80vh',
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '14px 16px', borderBottom: '0.5px solid var(--ou-border-subtle)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, var(--ou-accent-secondary, var(--ou-accent)), var(--ou-accent) 70%)',
          boxShadow: '0 0 6px 2px color-mix(in srgb, var(--ou-accent) 40%, transparent)',
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ou-text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          LIVE PREVIEW
        </span>
      </div>

      {/* 설정 pill */}
      <div style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--ou-border-subtle)' }}>
        <RecipePillStrip />
      </div>

      {/* 뷰 렌더 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {!domain && !viewType ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', margin: 0 }}>도메인과 렌더 방식을 선택하면</p>
            <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', margin: '4px 0 0' }}>미리보기가 표시됩니다</p>
          </div>
        ) : viewType ? (
          <ViewRenderer viewType={viewType} nodes={sampleNodes} />
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--ou-text-muted)', margin: 0 }}>렌더 방식을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
