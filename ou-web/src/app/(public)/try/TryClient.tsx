'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarBlank, CurrencyKrw, CheckSquare, SmileyMeh, ListChecks,
  Barbell, Brain, Users, Notebook, Lightbulb, BookOpen, FunnelSimple,
  Gift, Star, PaperPlaneRight,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';
import { getScenariosByStage, type Scenario } from '@/data/scenarios';
import { useChatStore } from '@/stores/chatStore';
import { DOMAIN_VIEW_MAP, VIEW_REGISTRY } from '@/components/views/registry';

const SCENARIO_ICONS: Record<string, ComponentType<any>> = {
  CalendarBlank, CurrencyKrw, CheckSquare, SmileyMeh, ListChecks,
  Barbell, Brain, Users, Notebook, Lightbulb, BookOpen, FunnelSimple, Gift, Star,
};

export function TryClient() {
  const router = useRouter();
  const scenarios = getScenariosByStage('guest');
  const [selected, setSelected] = useState<Scenario | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [streaming, setStreaming] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [viewType, setViewType] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg = { role: 'user' as const, content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text.trim() }],
          guest: true,
        }),
      });

      if (!res.ok) throw new Error();

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let nodeData: any = null;

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  assistantContent += parsed.token;
                  setMessages(prev => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { role: 'assistant', content: assistantContent };
                    return copy;
                  });
                }
                if (parsed.nodeCreated) {
                  nodeData = parsed.nodeCreated;
                }
              } catch { /* skip parse errors */ }
            }
          }
        }
      }

      // 뷰 생성
      if (nodeData) {
        const vt = DOMAIN_VIEW_MAP[nodeData.domain] ?? 'timeline';
        setViewType(vt);
        setViewData({
          nodes: [{
            id: 'try-node',
            raw: text.trim(),
            domain: nodeData.domain,
            domain_data: nodeData.domain_data ?? {},
            triples: [],
          }],
        });

        // 게스트 데이터 백업
        useChatStore.getState().setPendingMessage(null);
        useChatStore.getState().addMessage({
          id: `try-${Date.now()}`,
          role: 'user',
          content: text.trim(),
          createdAt: new Date(),
          nodeCreated: nodeData,
        });
        useChatStore.getState().persistGuest();
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '연결에 문제가 생겼어요. 다시 시도해주세요.' }]);
    }

    setStreaming(false);
  }, [streaming]);

  const handleScenarioClick = (scenario: Scenario) => {
    setSelected(scenario);
    handleSend(scenario.prompt);
  };

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // 뷰 컴포넌트 동적 렌더링
  const ViewComponent = viewType ? VIEW_REGISTRY[viewType] : null;

  return (
    <div style={{
      height: '100dvh',
      background: '#060810',
      display: 'flex',
      flexDirection: 'column',
      color: 'rgba(255,255,255,0.85)',
      fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
    }}>
      {/* 상단 헤더 */}
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "var(--font-orbitron, 'Orbitron'), sans-serif",
            fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '2px',
          }}
        >
          OU
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => router.push('/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit' }}
          >
            Log in
          </button>
          <button
            onClick={() => router.push('/login?signup=true')}
            className="pill-block"
            style={{ fontSize: 12, padding: '6px 16px' }}
          >
            Sign up
          </button>
        </div>
      </div>

      {/* 시나리오 선택 (채팅 시작 전) */}
      {messages.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '0 24px',
        }}>
          <div style={{ fontSize: 15, color: 'var(--ou-text-body)', textAlign: 'center' }}>
            무엇을 해볼까요?
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 480 }}>
            {scenarios.map(s => {
              const Icon = SCENARIO_ICONS[s.icon] ?? Star;
              return (
                <button
                  key={s.id}
                  onClick={() => handleScenarioClick(s)}
                  className="pill-block"
                  style={{ gap: 6 }}
                >
                  <Icon size={14} weight="bold" />
                  {s.title}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, width: '100%', maxWidth: 400, position: 'relative' }}>
            <input
              type="text"
              placeholder="또는 아무 말이나 해보세요..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(input); } }}
              className="input-block"
              style={{ width: '100%', paddingRight: 44 }}
            />
            {input.trim() && (
              <button
                onClick={() => handleSend(input)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                }}
              >
                <PaperPlaneRight size={18} weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 채팅 + 뷰 (채팅 시작 후) */}
      {messages.length > 0 && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* 좌: 채팅 */}
          <div style={{ width: 380, minWidth: 320, display: 'flex', flexDirection: 'column', borderRight: '0.5px solid var(--ou-border-faint)' }}>
            <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  ...(msg.role === 'user' ? {
                    padding: '12px 16px',
                    background: 'var(--ou-surface-subtle)',
                    border: '1px solid var(--ou-border-medium)',
                    borderRadius: '20px 20px 4px 20px',
                    fontSize: 13,
                    color: 'var(--ou-text-bright)',
                  } : {
                    paddingLeft: 14,
                    borderLeft: '1.5px solid var(--ou-border-muted)',
                    fontSize: 13,
                    lineHeight: 1.8,
                    color: 'var(--ou-text-body)',
                  }),
                }}>
                  {msg.content || (streaming && i === messages.length - 1 ? '...' : '')}
                </div>
              ))}
            </div>
          </div>

          {/* 우: 뷰 미리보기 */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {ViewComponent && viewData ? (
              <div style={{ width: '100%', height: '100%', padding: 24 }}>
                <ViewComponent nodes={viewData.nodes} />
                {/* 가입 유도 */}
                <div style={{
                  marginTop: 24, textAlign: 'center',
                  padding: '16px 24px',
                  border: '0.5px solid var(--ou-border-subtle)',
                  borderRadius: 16,
                }}>
                  <div style={{ fontSize: 14, color: 'var(--ou-text-strong)', marginBottom: 8 }}>
                    가입하면 이 뷰를 저장하고 계속 쌓을 수 있어요
                  </div>
                  <button
                    onClick={() => router.push('/login?signup=true')}
                    className="pill-block lg"
                    style={{ fontWeight: 600 }}
                  >
                    가입하기
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--ou-text-muted)' }}>
                <div style={{ fontSize: 13 }}>여기에 뷰가 생겨요</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>대화하면 데이터가 자동으로 시각화돼요</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
