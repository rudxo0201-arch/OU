'use client';
import { useState, useRef, useEffect } from 'react';
import { OrbChat } from '@/components/ds';
import { ActionPreview, type OrbAction } from './ActionPreview';
import { AdminTable } from './AdminTable';

interface OrbMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: OrbAction | null;
  queryResult?: Record<string, unknown>[] | null;
  executionResult?: string | null;
  streaming?: boolean;
}

interface AdminOrbProps {
  /** 현재 선택된 테이블 (컨텍스트 주입용) */
  currentTable?: string;
}

export function AdminOrb({ currentTable }: AdminOrbProps) {
  const [messages, setMessages] = useState<OrbMessage[]>([]);
  const [executing, setExecuting] = useState<string | null>(null); // 실행 중인 messageId
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    const userMsg: OrbMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentTable ? `[${currentTable}] ${text}` : text,
    };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: OrbMessage = { id: assistantId, role: 'assistant', text: '', streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    // 대화 히스토리 구성 (최근 10개)
    const history = [...messages.slice(-9), userMsg].map(m => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const res = await fetch('/api/admin/orb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) throw new Error('요청 실패');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'text') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, text: m.text + event.text } : m
              ));
            } else if (event.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, text: event.text, action: event.action, streaming: false }
                  : m
              ));
            } else if (event.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, text: `오류: ${event.message}`, streaming: false }
                  : m
              ));
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, text: `오류가 발생했습니다: ${String(e)}`, streaming: false }
          : m
      ));
    }
  };

  const executeAction = async (msgId: string, action: OrbAction) => {
    setExecuting(msgId);
    try {
      const res = await fetch('/api/admin/orb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], executeAction: action }),
      });
      const result = await res.json();

      if (result.error) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, executionResult: `오류: ${result.error}`, action: null } : m
        ));
        return;
      }

      // query 결과는 테이블로 표시
      if (result.type === 'query_result' && Array.isArray(result.data)) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, queryResult: result.data, action: null } : m
        ));
      } else {
        const msg = result.type === 'ddl_result'
          ? '스키마 변경이 완료되었습니다.'
          : `완료됐습니다.${result.count !== undefined ? ` (${result.count}건 영향)` : ''}`;
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, executionResult: msg, action: null } : m
        ));
      }
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderTop: '1px solid var(--ou-border-subtle)',
    }}>
      {/* 대화 목록 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 0,
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', flexDirection: 'column', gap: 8,
            color: 'var(--ou-text-muted)', fontSize: 12,
          }}>
            <span style={{ fontSize: 20, opacity: 0.3 }}>◎</span>
            <span>자연어로 DB를 관리하세요</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>예: "data_nodes 최근 10개 보여줘"</span>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {/* 말풍선 */}
            <div style={{
              maxWidth: '85%',
              padding: '8px 12px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user' ? 'var(--ou-surface-faint)' : 'transparent',
              border: msg.role === 'user' ? '1px solid var(--ou-border-faint)' : 'none',
              fontSize: 13,
              color: 'var(--ou-text-body)',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
              {msg.streaming && (
                <span style={{
                  display: 'inline-block', width: 6, height: 12,
                  background: 'var(--ou-text-muted)', marginLeft: 4,
                  animation: 'blink 0.8s ease-in-out infinite', verticalAlign: 'middle',
                }} />
              )}
            </div>

            {/* 액션 미리보기 */}
            {msg.action && !msg.streaming && (
              <div style={{ maxWidth: '85%', width: '100%' }}>
                <ActionPreview
                  action={msg.action}
                  onExecute={() => executeAction(msg.id, msg.action!)}
                  onCancel={() => setMessages(prev => prev.map(m =>
                    m.id === msg.id ? { ...m, action: null } : m
                  ))}
                  executing={executing === msg.id}
                />
              </div>
            )}

            {/* 쿼리 결과 테이블 */}
            {msg.queryResult && msg.queryResult.length > 0 && (
              <div style={{ maxWidth: '100%', width: '100%', overflowX: 'auto' }}>
                <QueryResultTable rows={msg.queryResult} />
              </div>
            )}

            {/* 실행 결과 */}
            {msg.executionResult && (
              <div style={{
                fontSize: 12, color: 'var(--ou-text-muted)',
                padding: '4px 10px',
                borderRadius: 6,
                background: 'var(--ou-surface-faint)',
              }}>
                {msg.executionResult}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div style={{ padding: '12px 16px', flexShrink: 0 }}>
        <OrbChat
          placeholder={currentTable ? `${currentTable}에 대해 질문하거나 명령하세요…` : '테이블 조회, 데이터 편집, 스키마 변경…'}
          onSend={send}
        />
      </div>
    </div>
  );
}

// 쿼리 결과를 간단한 테이블로 표시
function QueryResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  const keys = Object.keys(rows[0]).slice(0, 8); // 최대 8컬럼

  return (
    <div style={{
      borderRadius: 'var(--ou-radius-sm)',
      boxShadow: 'var(--ou-neu-pressed-sm)',
      background: 'var(--ou-bg)',
      overflow: 'hidden',
      fontSize: 11,
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: keys.map(() => '1fr').join(' '),
        padding: '6px 10px',
        background: 'var(--ou-surface-faint)',
        borderBottom: '1px solid var(--ou-border-faint)',
      }}>
        {keys.map(k => (
          <span key={k} style={{ fontWeight: 600, color: 'var(--ou-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {k}
          </span>
        ))}
      </div>
      {/* 행 */}
      {rows.slice(0, 50).map((row, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: keys.map(() => '1fr').join(' '),
            padding: '5px 10px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--ou-border-faint)' : 'none',
          }}
        >
          {keys.map(k => {
            const val = row[k];
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—');
            return (
              <span key={k} title={str} style={{ color: 'var(--ou-text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {str.length > 30 ? str.slice(0, 30) + '…' : str}
              </span>
            );
          })}
        </div>
      ))}
      {rows.length > 50 && (
        <div style={{ padding: '4px 10px', color: 'var(--ou-text-muted)', fontSize: 10 }}>
          +{rows.length - 50}개 더 있음
        </div>
      )}
    </div>
  );
}
