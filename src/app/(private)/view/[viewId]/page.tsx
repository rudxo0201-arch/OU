'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VIEW_REGISTRY, VIEW_LABELS } from '@/components/views/registry';
import { NeuButton, NeuCard, NeuModal } from '@/components/ds';

const VIEW_ICONS: Record<string, string> = {
  todo: '☑', calendar: '📅', table: '📊', task: '📋', dictionary: '📖',
  flashcard: '🃏', timeline: '⏳', chart: '📈', heatmap: '🟩',
  journal: '📓', profile: '👤', idea: '💡', curriculum: '📚',
  lecture: '🎓', scrap: '📌',
};

export default function ViewPage() {
  const { viewId } = useParams<{ viewId: string }>();
  const router = useRouter();
  const [viewData, setViewData] = useState<Record<string, unknown> | null>(null);
  const [nodes, setNodes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if (!viewId) return;

    // builtin-{viewType} 처리 — DB 없이 바로 렌더
    if (viewId.startsWith('builtin-')) {
      const vt = viewId.replace('builtin-', '');
      setViewData({ view_type: vt, name: VIEW_LABELS[vt] || vt });
      fetch(`/api/nodes?limit=200`)
        .then(r => r.json())
        .then(data => { if (data?.nodes) setNodes(data.nodes); })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }

    fetch(`/api/views?id=${viewId}`)
      .then(r => r.json())
      .then(data => {
        const view = data.view || data.views?.find((v: Record<string, unknown>) => v.id === viewId);
        if (view) {
          setViewData(view);
          const filterConfig = view.filter_config as Record<string, unknown> | undefined;
          return fetch(`/api/nodes?domain=${filterConfig?.domain || ''}&limit=200`);
        }
        return null;
      })
      .then(r => r?.json())
      .then(data => { if (data?.nodes) setNodes(data.nodes); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [viewId]);

  const viewType = (viewData?.view_type as string) || '';
  const ViewComponent = VIEW_REGISTRY[viewType];
  const viewLabel = (viewData?.name as string) || VIEW_LABELS[viewType] || '뷰';
  const viewIcon = VIEW_ICONS[viewType] || '◉';

  const handleAddToHome = useCallback(() => { setShowInstallGuide(true); setShowShare(false); }, []);
  const handleCopyLink = useCallback(() => { navigator.clipboard.writeText(window.location.href); setShowShare(false); }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ou-bg)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ou-text-disabled)', animation: 'blink 1s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--ou-bg)', paddingTop: 52, padding: '52px 116px 0' }}>
      {/* Top bar */}
      <div style={{
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid var(--ou-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NeuButton variant="ghost" size="sm" onClick={() => router.back()} style={{ padding: '4px 8px' }}>
            ←
          </NeuButton>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ou-text-heading)' }}>
            {viewIcon} {viewLabel}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <NeuButton variant="ghost" size="sm" onClick={() => setShowShare(!showShare)} style={{ padding: '4px 10px' }}>
            ⋯
          </NeuButton>

          {showShare && (
            <NeuCard variant="raised" style={{
              position: 'absolute', top: 40, right: 0,
              width: 180, padding: 4, zIndex: 100,
            }}>
              <ShareOption label="홈 화면에 추가" icon="📱" onClick={handleAddToHome} />
              <ShareOption label="링크 복사" icon="🔗" onClick={handleCopyLink} />
              <ShareOption label="공유" icon="↗" onClick={() => {
                navigator.share?.({ title: viewLabel, url: window.location.href });
                setShowShare(false);
              }} />
            </NeuCard>
          )}
        </div>
      </div>

      {/* View content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {ViewComponent ? (
          <>
            {nodes.length === 0 && <EmptyHint viewType={viewType} onOrb={() => router.push('/orb')} />}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <ViewComponent
              nodes={nodes as any}
              layoutConfig={viewData?.layout_config as Record<string, unknown>}
              filters={viewData?.filter_config as Record<string, unknown>}
            />
          </>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
            뷰를 찾을 수 없습니다
          </div>
        )}
      </div>

      {/* Install guide modal */}
      <NeuModal open={showInstallGuide} onClose={() => setShowInstallGuide(false)} title={`${viewIcon} ${viewLabel}`}>
        <InstallGuideContent />
      </NeuModal>

      {/* Click outside to close share menu */}
      {showShare && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowShare(false)} />
      )}
    </div>
  );
}

function ShareOption({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <NeuButton
      variant="ghost"
      size="sm"
      onClick={onClick}
      style={{ width: '100%', justifyContent: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8 }}
    >
      <span>{icon}</span>
      {label}
    </NeuButton>
  );
}

function EmptyHint({ viewType, onOrb }: { viewType: string; onOrb: () => void }) {
  const hints: Record<string, { example: string; label: string }> = {
    schedule: { example: '"다음 주 금요일 오후 3시 치과 예약"', label: '일정' },
    calendar:  { example: '"다음 주 금요일 오후 3시 치과 예약"', label: '일정' },
    timeline:  { example: '"다음 주 금요일 오후 3시 치과 예약"', label: '일정' },
    finance:   { example: '"오늘 점심 김치찌개 8,000원"', label: '지출/수입' },
    chart:     { example: '"이번 달 카페 지출 43,000원"', label: '지출' },
    task:      { example: '"내일까지 기획서 제출해야 해"', label: '할 일' },
    todo:      { example: '"내일까지 기획서 제출해야 해"', label: '할 일' },
    heatmap:   { example: '"오늘 러닝 5km 완료"', label: '습관' },
    habit:     { example: '"오늘 러닝 5km 완료"', label: '습관' },
    idea:      { example: '"배달앱 구독모델 아이디어"', label: '아이디어' },
    profile:   { example: '"김민지, 디자이너, 대학 친구"', label: '인물' },
    relation:  { example: '"김민지, 디자이너, 대학 친구"', label: '인물' },
    knowledge: { example: '"React useEffect는 사이드 이펙트 처리에 사용"', label: '지식' },
    flashcard: { example: '"React useEffect는 사이드 이펙트 처리에 사용"', label: '지식' },
    curriculum: { example: '"알고리즘 강의 3주차 - 그래프 탐색"', label: '수업' },
    lecture:   { example: '"알고리즘 강의 3주차 - 그래프 탐색"', label: '강의' },
    media:     { example: '"어제 본 기생충 9점, 봉준호 감독 최고작"', label: '미디어' },
    scrap:     { example: '"성수 팝업 스토어 링크 저장"', label: '스크랩' },
    youtube:   { example: '"유튜브 강의 링크 저장해줘"', label: 'YouTube' },
    map:       { example: '"성수동 카페 오프닉, 커피 맛집"', label: '장소' },
    location:  { example: '"성수동 카페 오프닉, 커피 맛집"', label: '장소' },
    boncho:    { example: '"감초 - 해독, 보비益氣 효능"', label: '약재' },
    dictionary: { example: '"木 - 나무 목, 부수 木"', label: '한자' },
    journal:   { example: '"오늘 좀 지쳐있는 것 같아"', label: '기록' },
  };

  const key = Object.keys(hints).find(k => viewType.startsWith(k)) || '';
  const hint = hints[key] || { example: '"오늘 있었던 일을 자유롭게 말해보세요"', label: '데이터' };

  return (
    <div style={{
      margin: '24px 20px 0',
      padding: '20px 24px',
      borderRadius: 16,
      background: 'var(--ou-bg)',
      boxShadow: 'var(--ou-neu-raised-sm)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ou-text-heading)', marginBottom: 12 }}>
        아직 {hint.label} 데이터가 없어요
      </div>
      <div style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Orb에서 이렇게 말해보세요
      </div>
      <div style={{
        padding: '12px 16px',
        borderRadius: 12,
        background: 'var(--ou-bg)',
        boxShadow: 'var(--ou-neu-pressed-sm)',
        fontSize: 13, color: 'var(--ou-text-body)',
        fontStyle: 'italic', marginBottom: 16,
      }}>
        {hint.example}
      </div>
      <button
        onClick={onOrb}
        style={{
          padding: '8px 20px', borderRadius: 999, border: 'none',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
          background: 'var(--ou-bg)',
          boxShadow: 'var(--ou-neu-raised-sm)',
          color: 'var(--ou-text-strong)',
        }}
      >
        Orb 열기 →
      </button>
    </div>
  );
}

function InstallGuideContent() {
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

  return (
    <NeuCard variant="pressed" style={{ padding: 16 }}>
      {isIOS ? (
        <div style={{ fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--ou-text-heading)' }}>iOS</div>
          1. 하단 Safari 공유 버튼 <span style={{ fontSize: 16 }}>↑</span> 탭<br />
          2. <strong>홈 화면에 추가</strong> 선택<br />
          3. <strong>추가</strong> 탭
        </div>
      ) : isAndroid ? (
        <div style={{ fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--ou-text-heading)' }}>Android</div>
          1. Chrome 메뉴 <strong>⋮</strong> 탭<br />
          2. <strong>홈 화면에 추가</strong> 선택<br />
          3. <strong>추가</strong> 탭
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--ou-text-heading)' }}>데스크탑</div>
          1. 브라우저 주소창 오른쪽 <strong>설치 아이콘</strong> 클릭<br />
          2. 또는 메뉴 → <strong>앱 설치</strong><br />
          3. 바탕화면에 바로가기 생성
        </div>
      )}
    </NeuCard>
  );
}
