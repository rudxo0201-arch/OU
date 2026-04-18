'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VIEW_REGISTRY, VIEW_LABELS } from '@/components/views/registry';

const VIEW_ICONS: Record<string, string> = {
  todo: '☑', calendar: '📅', table: '📊', task: '📋', dictionary: '📖',
  flashcard: '🃏', timeline: '⏳', chart: '📈', heatmap: '🟩',
  journal: '📓', profile: '👤', idea: '💡', curriculum: '📚',
  lecture: '🎓', scrap: '📌',
};

export default function ViewPage() {
  const { viewId } = useParams<{ viewId: string }>();
  const router = useRouter();
  const [viewData, setViewData] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // 뷰 데이터 + 노드 로드
  useEffect(() => {
    if (!viewId) return;

    // saved_views에서 뷰 정보 로드
    fetch(`/api/views?id=${viewId}`)
      .then(r => r.json())
      .then(data => {
        const view = data.view || data.views?.find((v: any) => v.id === viewId);
        if (view) {
          setViewData(view);
          // 뷰의 필터에 맞는 노드 로드
          return fetch(`/api/nodes?domain=${view.filter_config?.domain || ''}&limit=200`);
        }
        return null;
      })
      .then(r => r?.json())
      .then(data => {
        if (data?.nodes) setNodes(data.nodes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [viewId]);

  const viewType = viewData?.view_type || '';
  const ViewComponent = VIEW_REGISTRY[viewType];
  const viewLabel = viewData?.name || VIEW_LABELS[viewType] || '뷰';
  const viewIcon = VIEW_ICONS[viewType] || '◉';

  const handleAddToHome = useCallback(() => {
    setShowInstallGuide(true);
    setShowShare(false);
  }, []);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setShowShare(false);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--ou-border-subtle, rgba(255,255,255,0.06))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => router.push('/my')}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--ou-text-dimmed)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-strong)' }}>
            {viewIcon} {viewLabel}
          </span>
        </div>

        {/* Share button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowShare(!showShare)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '0.5px solid var(--ou-border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 14,
              color: 'var(--ou-text-dimmed)',
            }}
          >
            ⋯
          </button>

          {/* Share dropdown */}
          {showShare && (
            <div style={{
              position: 'absolute', top: 40, right: 0,
              width: 180, borderRadius: 10,
              border: '1px solid var(--ou-border-subtle)',
              background: 'rgba(20,20,25,0.95)',
              backdropFilter: 'blur(12px)',
              padding: 4, zIndex: 100,
              animation: 'ou-fade-in 0.15s ease',
            }}>
              <ShareOption label="홈 화면에 추가" icon="📱" onClick={handleAddToHome} />
              <ShareOption label="링크 복사" icon="🔗" onClick={handleCopyLink} />
              <ShareOption label="공유" icon="↗" onClick={() => {
                navigator.share?.({ title: viewLabel, url: window.location.href });
                setShowShare(false);
              }} />
            </div>
          )}
        </div>
      </div>

      {/* View content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {ViewComponent ? (
          <ViewComponent
            nodes={nodes}
            layoutConfig={viewData?.layout_config}
            filters={viewData?.filter_config}
          />
        ) : (
          <div style={{
            padding: 40, textAlign: 'center',
            color: 'var(--ou-text-dimmed)', fontSize: 13,
          }}>
            뷰를 찾을 수 없습니다
          </div>
        )}
      </div>

      {/* Install guide modal */}
      {showInstallGuide && (
        <InstallGuide
          viewLabel={viewLabel}
          viewIcon={viewIcon}
          onClose={() => setShowInstallGuide(false)}
        />
      )}

      {/* Click outside to close share menu */}
      {showShare && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

function ShareOption({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderRadius: 8, cursor: 'pointer',
        fontSize: 13, color: 'var(--ou-text-secondary, #ccc)',
        transition: '100ms ease',
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function InstallGuide({ viewLabel, viewIcon, onClose }: {
  viewLabel: string;
  viewIcon: string;
  onClose: () => void;
}) {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 320, borderRadius: 16,
          background: 'rgba(25,25,30,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 24,
          animation: 'ou-fade-in 0.2s ease',
        }}
      >
        {/* Preview */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 10px',
          }}>
            {viewIcon}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ou-text-strong)' }}>
            {viewLabel}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', marginTop: 2 }}>
            ouuniverse.com
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          padding: 16, borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {isIOS ? (
            <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.8 }}>
              <div style={{ marginBottom: 8, fontWeight: 500, color: 'var(--ou-text-strong)' }}>iOS</div>
              1. 하단 Safari 공유 버튼 <span style={{ fontSize: 16 }}>↑</span> 탭<br />
              2. <strong>홈 화면에 추가</strong> 선택<br />
              3. <strong>추가</strong> 탭
            </div>
          ) : isAndroid ? (
            <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.8 }}>
              <div style={{ marginBottom: 8, fontWeight: 500, color: 'var(--ou-text-strong)' }}>Android</div>
              1. Chrome 메뉴 <strong>⋮</strong> 탭<br />
              2. <strong>홈 화면에 추가</strong> 선택<br />
              3. <strong>추가</strong> 탭
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)', lineHeight: 1.8 }}>
              <div style={{ marginBottom: 8, fontWeight: 500, color: 'var(--ou-text-strong)' }}>데스크탑</div>
              1. 브라우저 주소창 오른쪽 <strong>설치 아이콘</strong> 클릭<br />
              2. 또는 메뉴 → <strong>앱 설치</strong><br />
              3. 바탕화면에 바로가기 생성
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 16,
            padding: '10px 0', borderRadius: 999,
            border: '0.5px solid var(--ou-border-subtle)',
            fontSize: 13, color: 'var(--ou-text-dimmed)',
            cursor: 'pointer',
          }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
