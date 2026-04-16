'use client';

import { useCallback, useRef, useState } from 'react';
import { PaperPlaneRight, Lightning, User, File } from '@phosphor-icons/react';
import type { ViewProps } from './registry';
import { useDevWorkspaceStore } from '@/stores/devWorkspaceStore';
import { parseActions, stripActions } from '@/lib/dev/action-executor';
import { ActionBlock } from './dev/ActionBlock';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIDevView({ nodes }: ViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const wsStore = useDevWorkspaceStore();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    const assistantMsg: ChatMessage = { id: `a-${Date.now()}`, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);
    scrollToBottom();

    try {
      const chatMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const recentTerminal = wsStore.terminalOutput.slice(-5).map(t => ({
        command: t.command,
        stdout: t.stdout,
        stderr: t.stderr,
        exitCode: t.exitCode,
      }));

      const context: Record<string, any> = {
        activeFilePath: wsStore.activeFilePath,
        selectedText: wsStore.selectedText || undefined,
      };

      if (wsStore.isAdminMode) {
        if (recentTerminal.length > 0) context.recentTerminalOutput = recentTerminal;
        if (wsStore.currentErrors.length > 0) context.currentErrors = wsStore.currentErrors;
        if (wsStore.gitBranch) context.gitBranch = wsStore.gitBranch;
        if (wsStore.gitChanges.length > 0) context.gitChanges = wsStore.gitChanges;
        if (wsStore.gitLog.length > 0) context.gitLog = wsStore.gitLog.slice(0, 5);
      }

      if (wsStore.projectId) {
        context.projectId = wsStore.projectId;
        context.projectName = wsStore.projectName;
      }

      const res = await fetch('/api/dev/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          context,
        }),
      });

      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullText += data.text;
              setMessages(prev =>
                prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullText } : m)
              );
              scrollToBottom();
            }
          } catch { /* non-JSON SSE lines */ }
        }
      }
    } catch (e) {
      setMessages(prev =>
        prev.map(m => m.id === assistantMsg.id ? { ...m, content: '연결 오류가 발생했습니다.' } : m)
      );
    }

    setStreaming(false);
    scrollToBottom();
  }, [input, streaming, messages, scrollToBottom, wsStore]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12, borderBottom: '1px solid var(--ou-border-muted, #333)', flexShrink: 0, flexWrap: 'nowrap' }}>
        <Lightning size={14} color="var(--mantine-color-yellow-5, #ffd43b)" />
        <span style={{ fontSize: 12, fontWeight: 600 }}>AI Dev</span>
        {wsStore.activeFilePath && (
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: 'var(--ou-bg-subtle, rgba(255,255,255,0.06))', color: 'var(--ou-text-dimmed, #888)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <File size={8} />
            {wsStore.activeFilePath.split('/').pop()}
          </span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8 }}>
            <Lightning size={32} color="var(--ou-border-muted, #333)" />
            <span style={{ fontSize: 13, color: 'var(--ou-text-dimmed, #888)' }}>AI에게 개발 요청을 해보세요</span>
            <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)' }}>&quot;이 함수 리팩토링해줘&quot;, &quot;에러 원인 분석해줘&quot;</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: msg.role === 'user'
                    ? 'var(--ou-blue, #1565c0)'
                    : 'var(--ou-border-muted, #333)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {msg.role === 'user'
                  ? <User size={14} color="white" />
                  : <Lightning size={14} color="var(--mantine-color-yellow-5, #ffd43b)" />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed, #888)', display: 'block', marginBottom: 2 }}>{msg.role === 'user' ? 'You' : 'AI'}</span>
                {msg.role === 'assistant' && msg.content ? (() => {
                  const actions = parseActions(msg.content);
                  const textOnly = stripActions(msg.content);
                  return (
                    <>
                      {textOnly && (
                        <span
                          style={{
                            fontSize: 12,
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace',
                            lineHeight: 1.6,
                          }}
                        >
                          {textOnly}
                        </span>
                      )}
                      {actions.map((action, i) => (
                        <ActionBlock key={`${msg.id}-action-${i}`} action={action} />
                      ))}
                    </>
                  );
                })() : (
                  <span
                    style={{
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      fontFamily: msg.role === 'assistant' ? 'monospace' : 'inherit',
                      lineHeight: 1.6,
                    }}
                  >
                    {msg.content}
                    {streaming && msg.role === 'assistant' && !msg.content && (
                      <span style={{ color: 'var(--mantine-color-yellow-5, #ffd43b)' }}>...</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div
        style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: 12, borderTop: '1px solid var(--ou-border-muted, #333)', flexShrink: 0, flexWrap: 'nowrap' }}
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="AI에게 요청..."
          disabled={streaming}
          rows={1}
          style={{
            flex: 1,
            fontSize: 12,
            padding: '8px 12px',
            borderRadius: 8,
            border: '0.5px solid var(--ou-border, #333)',
            background: 'var(--ou-bg-subtle, rgba(255,255,255,0.04))',
            color: 'inherit',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || streaming}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: 'var(--ou-blue, #1565c0)',
            color: 'white',
            cursor: !input.trim() || streaming ? 'default' : 'pointer',
            opacity: !input.trim() || streaming ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <PaperPlaneRight size={16} />
        </button>
      </div>
    </div>
  );
}
