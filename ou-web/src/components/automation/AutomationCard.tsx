'use client';

import {
  DotsThree, Play, PencilSimple, Trash,
  Lightning, Clock, MagnifyingGlass, Database, HashStraight,
  Eye, FileText, ShareNetwork, Bell, Robot, Globe,
} from '@phosphor-icons/react';
import { useState } from 'react';

// ─── Labels ─────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  node_created: { label: '데이터 생성 시', icon: Lightning },
  schedule:     { label: '예약 실행',     icon: Clock },
  keyword:      { label: '키워드 감지',   icon: MagnifyingGlass },
  domain_match: { label: '도메인 일치',   icon: Database },
  count_threshold: { label: '개수 도달', icon: HashStraight },
};

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  create_view:       { label: '뷰 생성',    icon: Eye },
  export_document:   { label: '문서 내보내기', icon: FileText },
  post_social:       { label: 'SNS 포스트',  icon: ShareNetwork },
  send_notification: { label: '알림 보내기',  icon: Bell },
  run_llm:           { label: 'AI 처리',     icon: Robot },
  webhook:           { label: '웹훅 호출',   icon: Globe },
};

// ─── Types ──────────────────────────────────────────────────

interface AutomationNodeData {
  id: string;
  title: string;
  domain_data: {
    trigger?: { type: string; config?: Record<string, unknown> };
    actions?: { type: string; config?: Record<string, unknown> }[];
    enabled?: boolean;
    lastRunAt?: string;
    lastRunStatus?: string;
    lastRunError?: string;
  };
}

interface AutomationCardProps {
  automation: AutomationNodeData;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
}

export function AutomationCard({
  automation,
  onToggle,
  onEdit,
  onDelete,
  onRun,
}: AutomationCardProps) {
  const dd = automation.domain_data;
  const enabled = dd.enabled ?? false;
  const triggerType = dd.trigger?.type ?? 'node_created';
  const actions = dd.actions ?? [];
  const [menuOpen, setMenuOpen] = useState(false);

  const triggerInfo = TRIGGER_LABELS[triggerType] ?? { label: triggerType, icon: Lightning };
  const TriggerIcon = triggerInfo.icon;

  const lastRun = dd.lastRunAt
    ? new Date(dd.lastRunAt).toLocaleString('ko-KR', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 'var(--mantine-radius-md)',
        border: `0.5px solid ${enabled ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-dark-6)'}`,
        opacity: enabled ? 1 : 0.6,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--mantine-font-size-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {automation.title}
          </span>

          <div style={{ display: 'flex', flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: 'var(--mantine-color-dimmed)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TriggerIcon size={12} />
              {triggerInfo.label}
            </span>

            {actions.map((action, i) => {
              const info = ACTION_LABELS[action.type] ?? { label: action.type, icon: Lightning };
              const ActionIcon_ = info.icon;
              return (
                <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px dotted var(--mantine-color-default-border)', color: 'var(--mantine-color-dimmed)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ActionIcon_ size={12} />
                  {info.label}
                </span>
              );
            })}
          </div>

          {lastRun && (
            <span style={{ fontSize: 'var(--mantine-font-size-xs)', color: 'var(--mantine-color-dimmed)' }}>
              마지막 실행: {lastRun}
              {dd.lastRunStatus === 'error' && (
                <span style={{ color: 'var(--mantine-color-red-5)', marginLeft: 4 }}>(실패)</span>
              )}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => onToggle(automation.id, !enabled)}
              style={{ width: 18, height: 18 }}
            />
          </label>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'inherit' }}
            >
              <DotsThree size={20} weight="bold" />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--mantine-color-dark-7)',
                border: '0.5px solid var(--mantine-color-default-border)',
                borderRadius: 8,
                padding: 4,
                zIndex: 20,
                minWidth: 120,
              }}>
                <button onClick={() => { onRun(automation.id); setMenuOpen(false); }} style={{ width: '100%', padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', fontSize: 'var(--mantine-font-size-sm)' }}>
                  <Play size={16} /> 지금 실행
                </button>
                <button onClick={() => { onEdit(automation.id); setMenuOpen(false); }} style={{ width: '100%', padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'inherit', fontSize: 'var(--mantine-font-size-sm)' }}>
                  <PencilSimple size={16} /> 수정
                </button>
                <div style={{ height: 1, background: 'var(--mantine-color-default-border)', margin: '4px 0' }} />
                <button onClick={() => { onDelete(automation.id); setMenuOpen(false); }} style={{ width: '100%', padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mantine-color-red-5)', fontSize: 'var(--mantine-font-size-sm)' }}>
                  <Trash size={16} /> 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
