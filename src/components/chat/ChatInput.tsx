'use client';

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { NeuCard, NeuButton, NeuModal } from '@/components/ds';
import { stripLLMMeta } from '@/lib/utils/stripLLMMeta';

interface ChatInputProps {
  initialMessage?: string | null;
  onSent?: () => void;
}

export interface ChatInputHandle {
  sendMessage: (text: string, linkedNodeId?: string) => void;
}

const LONG_TEXT_THRESHOLD = 300;

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { initialMessage, onSent }: ChatInputProps = {},
  ref
) {
  const [input, setInput] = useState('');
  const [rows, setRows] = useState(1);
  const [longTextCollapsed, setLongTextCollapsed] = useState(false);
  const [longTextEditorOpen, setLongTextEditorOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addMessage, updateMessage, isStreaming, setStreaming, setLastCreatedNodeId, setPendingViewOptions, setLastIntent } = useChatStore();
  const autoSentRef = useRef(false);

  // ---- Hanja detection ----
  const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

  const fetchHanjaResults = useCallback(async (text: string, chars: string[]) => {
    try {
      const res = await fetch(`/api/hanja/search?q=${encodeURIComponent(chars.join(''))}&limit=200`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.nodes?.length) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = data.nodes.map((n: any) => ({
        char: n.domain_data.char,
        nodeId: n.id,
        hangul_reading: n.domain_data.hangul_reading,
        readings_ko: n.domain_data.readings?.ko || [],
        ko_hun: n.domain_data.readings?.ko_hun,
        definition_en: n.domain_data.definition_en,
        radical_char: n.domain_data.radical_char,
        radical_name_ko: n.domain_data.radical_name_ko,
        stroke_count: n.domain_data.stroke_count,
        grade: n.domain_data.grade,
        composition: n.domain_data.composition,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results.sort((a: any, b: any) => text.indexOf(a.char) - text.indexOf(b.char));
      return results;
    } catch { return null; }
  }, []);

  const detectAndFetchHanja = useCallback(async (text: string, messageId: string) => {
    const chars = Array.from(new Set(text.match(CJK_REGEX) || []));
    if (chars.length === 0) return;
    const results = await fetchHanjaResults(text, chars);
    if (results) updateMessage(messageId, { hanjaResults: results });
  }, [fetchHanjaResults, updateMessage]);

  const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;

  // ---- Send text message ----
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    setRows(1);

    const hanjaChars = Array.from(new Set(text.match(CJK_REGEX) || []));
    const textNoSpace = text.replace(/\s/g, '');
    const hanjaRatio = textNoSpace.length > 0 ? hanjaChars.length / textNoSpace.length : 0;
    const allMessages = useChatStore.getState().messages;
    const prevUserMsg = [...allMessages].reverse().find((m) => m.role === 'user');
    const isSearchMode = !!(prevUserMsg?.hanjaResults && prevUserMsg.hanjaResults.length > 0 && hanjaRatio >= 0.5);

    const userMsgId = `u-${Date.now()}`;
    const ytMatch = text.match(YOUTUBE_REGEX);
    addMessage({
      id: userMsgId,
      role: 'user',
      content: text,
      createdAt: new Date(),
      ...(ytMatch ? { youtubeEmbed: { videoId: ytMatch[1] } } : {}),
    });
    setYtPreview(null);

    if (isSearchMode && hanjaChars.length > 0) {
      const results = await fetchHanjaResults(text, hanjaChars);
      if (results) updateMessage(userMsgId, { hanjaResults: results });
      return;
    }

    if (hanjaChars.length > 0) {
      detectAndFetchHanja(text, userMsgId);
    }

    const ytIngest = text.match(YOUTUBE_REGEX);
    if (ytIngest) {
      const assistantId = `a-${Date.now()}`;
      addMessage({ id: assistantId, role: 'assistant', content: '유튜브 영상을 분석하고 있어요...', createdAt: new Date(), streaming: true });
      setStreaming(true);
      try {
        const res = await fetch('/api/ingest/youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: text }),
        });
        const data = await res.json();
        updateMessage(assistantId, {
          content: data.summary || '영상을 구조화했어요.',
          streaming: false,
          nodeCreated: data.nodeId ? { domain: 'media', nodeId: data.nodeId } : undefined,
        });
      } catch {
        updateMessage(assistantId, { content: '영상 분석에 실패했어요.', streaming: false });
      } finally {
        setStreaming(false);
      }
      return;
    }

    const assistantId = `a-${Date.now()}`;
    addMessage({ id: assistantId, role: 'assistant', content: '', createdAt: new Date(), streaming: true });
    setStreaming(true);

    try {
      const msgs = useChatStore.getState().messages;
      const apiMessages = msgs.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        updateMessage(assistantId, {
          content: err.error === 'TOKEN_LIMIT_EXCEEDED' ? '오늘 대화 한도에 도달했어요.' : '죄송해요, 잠시 후 다시 시도해주세요.',
          streaming: false,
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let accumulated = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let nodeInfo: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) { accumulated += data.text; updateMessage(assistantId, { content: accumulated }); }
            if (data.done) {
              nodeInfo = { domain: data.domain, nodeId: data.nodeId, confidence: data.confidence, domain_data: data.domain_data, suggestions: data.suggestions, additionalNodes: data.additionalNodes };
              // 뷰 선택지: done 이벤트의 viewData에서 추출
              if (data.viewData?.viewOptions?.length > 0) {
                setPendingViewOptions({
                  options: data.viewData.viewOptions,
                  filter: data.viewData.filter,
                  cards: data.viewData.cards,
                  intent: data.viewData.intent,
                  nodeId: data.nodeId,
                });
              }
              setLastIntent(data.viewData?.intent ?? null);
            }
          } catch { /* skip */ }
        }
      }

      // 클라이언트 안전망: 혹시 남아있는 메타블록 strip
      const safeAccumulated = stripLLMMeta(accumulated);
      if (safeAccumulated !== accumulated) {
        updateMessage(assistantId, { content: safeAccumulated });
      }

      updateMessage(assistantId, {
        streaming: false,
        suggestions: nodeInfo?.suggestions,
        ...(nodeInfo?.domain ? { nodeCreated: nodeInfo } : {}),
      });
      if (nodeInfo?.nodeId) setLastCreatedNodeId(nodeInfo.nodeId);
    } catch {
      updateMessage(assistantId, { content: '연결에 문제가 생겼어요. 다시 시도해주세요.', streaming: false });
    } finally {
      setStreaming(false);
    }
  }, [input, isStreaming, addMessage, updateMessage, setStreaming, setLastCreatedNodeId, setPendingViewOptions, setLastIntent]);

  // Auto-send initial message (from Spotlight)
  useEffect(() => {
    if (initialMessage && !autoSentRef.current && !isStreaming) {
      autoSentRef.current = true;
      setInput(initialMessage);
      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.value = initialMessage;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        sendWithText(initialMessage);
        onSent?.();
      }, 50);
    }
  }, [initialMessage, isStreaming, onSent]);

  // Send with explicit text (for auto-send / suggestion clicks)
  const sendWithText = useCallback(async (text: string, linkedNodeId?: string) => {
    if (!text.trim() || isStreaming) return;
    setInput('');
    setRows(1);

    const userMsgId = `u-${Date.now()}`;
    addMessage({ id: userMsgId, role: 'user', content: text.trim(), createdAt: new Date() });

    const assistantId = `a-${Date.now()}`;
    addMessage({ id: assistantId, role: 'assistant', content: '', createdAt: new Date(), streaming: true });
    setStreaming(true);

    try {
      const msgs = useChatStore.getState().messages;
      const apiMessages = msgs.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, ...(linkedNodeId ? { linkedNodeId } : {}) }),
      });
      if (!res.ok) {
        updateMessage(assistantId, { content: '잠시 후 다시 시도해주세요.', streaming: false });
        setStreaming(false);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let accumulated = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let nodeInfo: any = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) { accumulated += data.text; updateMessage(assistantId, { content: accumulated }); }
            if (data.done) {
              nodeInfo = { domain: data.domain, nodeId: data.nodeId, confidence: data.confidence, domain_data: data.domain_data, suggestions: data.suggestions, additionalNodes: data.additionalNodes };
              if (data.viewData?.viewOptions?.length > 0) {
                setPendingViewOptions({
                  options: data.viewData.viewOptions,
                  filter: data.viewData.filter,
                  cards: data.viewData.cards,
                  intent: data.viewData.intent,
                  nodeId: data.nodeId,
                });
              }
              setLastIntent(data.viewData?.intent ?? null);
            }
          } catch {}
        }
      }

      // 클라이언트 안전망: 혹시 남아있는 메타블록 strip
      const safeAccumulated = stripLLMMeta(accumulated);
      if (safeAccumulated !== accumulated) {
        updateMessage(assistantId, { content: safeAccumulated });
      }

      updateMessage(assistantId, {
        streaming: false,
        suggestions: nodeInfo?.suggestions,
        ...(nodeInfo?.domain ? { nodeCreated: nodeInfo } : {}),
      });
      if (nodeInfo?.nodeId) setLastCreatedNodeId(nodeInfo.nodeId);
    } catch {
      updateMessage(assistantId, { content: '연결에 문제가 생겼어요.', streaming: false });
    } finally {
      setStreaming(false);
    }
  }, [isStreaming, addMessage, updateMessage, setStreaming, setLastCreatedNodeId, setPendingViewOptions, setLastIntent]);

  useImperativeHandle(ref, () => ({ sendMessage: (text: string, linkedNodeId?: string) => sendWithText(text, linkedNodeId) }), [sendWithText]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (isImage) {
      const preview = URL.createObjectURL(file);
      addMessage({ id: `u-${Date.now()}`, role: 'user', content: `[이미지: ${file.name}]`, createdAt: new Date(), imagePreview: preview });
      const assistantId = `a-${Date.now()}`;
      addMessage({ id: assistantId, role: 'assistant', content: '이미지를 분석하고 있어요...', createdAt: new Date(), streaming: true });
      setStreaming(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/ocr', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.text) {
          updateMessage(assistantId, { content: data.text, streaming: false, ocrResult: { text: data.text, imageType: data.imageType || 'general' } });
        } else {
          updateMessage(assistantId, { content: '이미지에서 텍스트를 추출하지 못했어요.', streaming: false });
        }
      } catch {
        updateMessage(assistantId, { content: '이미지 분석에 실패했어요.', streaming: false });
      } finally {
        setStreaming(false);
      }
    } else if (isPDF || file.name.match(/\.(docx?|xlsx?|pptx?|hwp|hwpx|txt|md)$/i)) {
      addMessage({ id: `u-${Date.now()}`, role: 'user', content: `[파일: ${file.name}]`, createdAt: new Date() });
      const assistantId = `a-${Date.now()}`;
      addMessage({ id: assistantId, role: 'assistant', content: '파일을 분석하고 있어요...', createdAt: new Date(), streaming: true });
      setStreaming(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        updateMessage(assistantId, {
          content: data.summary || `${file.name}을 구조화했어요.`,
          streaming: false,
          fileResult: { fileType: data.fileType || 'text', fileName: file.name, pageCount: data.pageCount, textContent: data.textContent, nodeId: data.nodeId },
        });
      } catch {
        updateMessage(assistantId, { content: '파일 분석에 실패했어요.', streaming: false });
      } finally {
        setStreaming(false);
      }
    }
  }, [addMessage, updateMessage, setStreaming]);

  // ---- YouTube link detection (realtime) ----
  const [ytPreview, setYtPreview] = useState<{ videoId: string; url: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.length > LONG_TEXT_THRESHOLD && !longTextCollapsed) {
      setLongTextCollapsed(true);
    } else if (val.length <= LONG_TEXT_THRESHOLD && longTextCollapsed) {
      setLongTextCollapsed(false);
    }

    const lineCount = Math.min(val.split('\n').length, 6);
    setRows(Math.max(1, lineCount));

    const ytMatch = val.match(YOUTUBE_REGEX);
    if (ytMatch) {
      setYtPreview({ videoId: ytMatch[1], url: ytMatch[0] });
    } else {
      setYtPreview(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* YouTube preview */}
      {ytPreview && (
        <NeuCard variant="raised" size="sm" style={{ marginBottom: 8, padding: 0, overflow: 'hidden', animation: 'ou-fade-in 0.2s ease' }}>
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytPreview.videoId}?rel=0`}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>엔터를 누르면 영상을 분석합니다</span>
            <NeuButton
              variant="ghost"
              size="sm"
              onClick={() => { setYtPreview(null); setInput(input.replace(YOUTUBE_REGEX, '').trim()); }}
              style={{ padding: '2px 6px', fontSize: 11 }}
            >
              ✕
            </NeuButton>
          </div>
        </NeuCard>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt,.md"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {/* Long text editor modal */}
      <NeuModal
        open={longTextEditorOpen}
        onClose={() => setLongTextEditorOpen(false)}
        title={`입력 내용 수정 · ${input.length.toLocaleString()}자`}
        maxWidth={600}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-pressed-sm)',
            borderRadius: 'var(--ou-radius-sm)',
            padding: 14,
            color: 'var(--ou-text-strong)',
            fontSize: 14,
            lineHeight: 1.7,
            resize: 'vertical',
            fontFamily: 'inherit',
            minHeight: 200,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <NeuButton
            variant="ghost"
            size="sm"
            onClick={() => { setInput(''); setLongTextCollapsed(false); setLongTextEditorOpen(false); }}
          >
            삭제
          </NeuButton>
          <NeuButton variant="default" size="sm" onClick={() => setLongTextEditorOpen(false)}>
            확인
          </NeuButton>
        </div>
      </NeuModal>

      {/* Input bar */}
      <div
        style={{
          background: 'var(--ou-bg)',
          borderRadius: 'var(--ou-radius-lg)',
          boxShadow: 'var(--ou-neu-raised-md)',
          padding: '16px 20px 12px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all var(--ou-transition)',
        }}
      >
        {longTextCollapsed ? (
          <div
            onClick={() => setLongTextEditorOpen(true)}
            style={{ width: '100%', minHeight: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
          >
            <span
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--ou-radius-sm)',
                background: 'var(--ou-bg)',
                boxShadow: 'var(--ou-neu-pressed-sm)',
                fontSize: 13,
                color: 'var(--ou-text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>📄</span>
              문서가 입력되었습니다. {input.length.toLocaleString()}자
            </span>
            <span style={{ fontSize: 11, color: 'var(--ou-text-muted)' }}>클릭하여 수정</span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={rows}
            placeholder="Just talk..."
            disabled={isStreaming}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--ou-text-strong)',
              fontSize: 16,
              lineHeight: 1.6,
              resize: 'none',
              fontFamily: 'inherit',
              minHeight: 40,
            }}
          />
        )}

        {/* Bottom toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10 }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isStreaming}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--ou-bg)',
              boxShadow: 'var(--ou-neu-raised-sm)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              opacity: isStreaming ? 0.3 : 1,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              transition: 'all var(--ou-transition)',
              fontSize: 18,
              fontWeight: 300,
              color: 'var(--ou-text-secondary)',
            }}
          >
            +
          </button>

          <span style={{ flex: 1 }} />

          <button
            onClick={send}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: input.trim() && !isStreaming
                ? 'linear-gradient(135deg, var(--ou-accent), var(--ou-accent-secondary))'
                : 'var(--ou-bg)',
              boxShadow: input.trim() && !isStreaming ? 'var(--ou-neu-raised-sm)' : 'var(--ou-neu-raised-xs)',
              border: 'none',
              transition: 'all var(--ou-transition)',
              flexShrink: 0,
              cursor: !input.trim() || isStreaming ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke={input.trim() && !isStreaming ? '#fff' : 'var(--ou-text-disabled)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
