'use client';
import { NeuButton } from '@/components/ds';

export interface OrbAction {
  type: 'query' | 'update' | 'create' | 'delete' | 'ddl' | 'generate' | 'none';
  table?: string;
  sql?: string;
  filter?: Record<string, unknown>;
  data?: Record<string, unknown>;
  ddl?: string;
  description?: string;
  danger?: boolean;
  preview_query?: string;
}

interface ActionPreviewProps {
  action: OrbAction;
  onExecute: () => void;
  onCancel: () => void;
  executing?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  query: '조회',
  update: '수정',
  create: '생성',
  delete: '삭제',
  ddl: '스키마 변경',
  generate: '데이터 생성',
};

export function ActionPreview({ action, onExecute, onCancel, executing }: ActionPreviewProps) {
  if (action.type === 'none') return null;

  const isDanger = action.danger;

  return (
    <div style={{
      borderRadius: 'var(--ou-radius-md)',
      border: '1px solid var(--ou-border-subtle)',
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'var(--ou-surface-faint)',
        borderBottom: '1px solid var(--ou-border-faint)',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--ou-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {ACTION_LABELS[action.type] ?? action.type}
        </span>
        {action.table && (
          <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>
            — {action.table}
          </span>
        )}
        {isDanger && (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: 'var(--ou-text-muted)',
            border: '1px solid var(--ou-border-subtle)',
            borderRadius: 4, padding: '1px 6px',
            marginLeft: 'auto',
          }}>
            확인 필요
          </span>
        )}
      </div>

      {/* 내용 */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {action.description && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ou-text-body)', lineHeight: 1.5 }}>
            {action.description}
          </p>
        )}

        {(action.sql || action.ddl) && (
          <pre style={{
            margin: 0, padding: '8px 10px',
            borderRadius: 'var(--ou-radius-sm)',
            background: 'var(--ou-surface-faint)',
            boxShadow: 'var(--ou-neu-pressed-sm)',
            fontSize: 11, fontFamily: 'monospace',
            color: 'var(--ou-text-secondary)',
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {action.sql || action.ddl}
          </pre>
        )}

        {action.data && (
          <pre style={{
            margin: 0, padding: '8px 10px',
            borderRadius: 'var(--ou-radius-sm)',
            background: 'var(--ou-surface-faint)',
            boxShadow: 'var(--ou-neu-pressed-sm)',
            fontSize: 11, fontFamily: 'monospace',
            color: 'var(--ou-text-secondary)',
            overflowX: 'auto', whiteSpace: 'pre-wrap',
          }}>
            {JSON.stringify(action.data, null, 2)}
          </pre>
        )}

        {isDanger && action.type === 'ddl' && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ou-text-muted)', lineHeight: 1.5 }}>
            ⚠ 스키마 변경은 되돌리기 어렵습니다. 실행 전 반드시 내용을 확인하세요.
          </p>
        )}
      </div>

      {/* 버튼 */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '10px 14px',
        borderTop: '1px solid var(--ou-border-faint)',
        background: 'var(--ou-surface-faint)',
        justifyContent: 'flex-end',
      }}>
        <NeuButton variant="ghost" size="sm" onClick={onCancel} disabled={executing}>
          취소
        </NeuButton>
        <NeuButton variant="default" size="sm" onClick={onExecute} disabled={executing}>
          {executing ? '실행 중…' : action.type === 'query' ? '조회' : '실행'}
        </NeuButton>
      </div>
    </div>
  );
}
