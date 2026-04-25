'use client';
import { DOMAINS } from '@/lib/ou-registry';

import { ScheduleDetailView } from './templates/ScheduleDetailView';
import { TaskDetailView } from './templates/TaskDetailView';
import { HabitDetailView } from './templates/HabitDetailView';
import { JournalEditorView } from './templates/JournalEditorView';
import { DateDetailView } from './templates/DateDetailView';

export interface FullNode {
  id: string;
  domain: string;
  raw: string;
  domain_data: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
}

interface Props {
  node: FullNode;
  onClose?: () => void;
}

const DOMAIN_LABELS: Record<string, string> = {
  schedule: '일정',
  task:     '할일',
  habit:    '습관',
  journal:  '일기',
  date:     '날짜',
};

export function PageRenderer({ node, onClose }: Props) {
  const domain = node.domain ?? 'unknown';
  const domainLabel = DOMAIN_LABELS[domain] ?? domain;

  const updatedAt = node.updated_at ?? node.created_at;
  const updatedStr = updatedAt
    ? new Date(updatedAt).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  return (
    <div style={{
      width: '100%',
      minHeight: '100%',
      background: 'transparent',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* header row: domain badge + close */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px 0',
      }}>
        {/* domain badge — same style as NodeDetailCard */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.06)',
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {domainLabel}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {updatedStr && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>
              {updatedStr}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 18,
                lineHeight: 1,
                padding: '2px 4px',
                borderRadius: 4,
                transition: 'color 120ms ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
              aria-label="닫기"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* domain template */}
      <div style={{ flex: 1 }}>
        {domain === DOMAINS.SCHEDULE && <ScheduleDetailView node={node} />}
        {domain === DOMAINS.TASK     && <TaskDetailView     node={node} />}
        {domain === DOMAINS.HABIT    && <HabitDetailView    node={node} />}
        {domain === DOMAINS.JOURNAL  && <JournalEditorView  node={node} />}
        {domain === 'date'     && <DateDetailView     node={node} />}

        {/* fallback for unknown domains */}
        {!['schedule', 'task', 'habit', 'journal', 'date'].includes(domain) && (
          <div style={{ padding: 24 }}>
            <div style={{
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 8,
              fontWeight: 600,
            }}>
              원문
            </div>
            <div style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '10px 14px',
            }}>
              {node.raw || '(내용 없음)'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
