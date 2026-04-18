'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';

interface ChatInputProps {
  initialMessage?: string | null;
  onSent?: () => void;
}

export function ChatInput({ initialMessage, onSent }: ChatInputProps = {}) {
  const [input, setInput] = useState('');
  const [rows, setRows] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addMessage, updateMessage, isStreaming, setStreaming } = useChatStore();
  const autoSentRef = useRef(false);

  // ---- Hanja detection ----
  const CJK_REGEX = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g;

  const fetchHanjaResults = useCallback(async (text: string, chars: string[]) => {
    try {
      const res = await fetch(`/api/hanja/search?q=${encodeURIComponent(chars.join(''))}&limit=200`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.nodes?.length) return null;

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

  // YouTube URL detection
  const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;

  // ---- Send text message ----
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    setRows(1);

    // 한자 검색 모드 판별
    const hanjaChars = Array.from(new Set(text.match(CJK_REGEX) || []));
    const textNoSpace = text.replace(/\s/g, '');
    const hanjaRatio = textNoSpace.length > 0 ? hanjaChars.length / textNoSpace.length : 0;
    const allMessages = useChatStore.getState().messages;
    const prevUserMsg = [...allMessages].reverse().find(m => m.role === 'user');
    const isSearchMode = !!(prevUserMsg?.hanjaResults && prevUserMsg.hanjaResults.length > 0 && hanjaRatio >= 0.5);

    const userMsgId = `u-${Date.now()}`;
    addMessage({
      id: userMsgId,
      role: 'user',
      content: text,
      createdAt: new Date(),
    });

    // 검색 모드: LLM 스킵, 한자 카드만 표시
    if (isSearchMode && hanjaChars.length > 0) {
      const results = await fetchHanjaResults(text, hanjaChars);
      if (results) updateMessage(userMsgId, { hanjaResults: results });
      return;
    }

    // 한자 감지 (비동기, 채팅 흐름 블로킹 안 함)
    if (hanjaChars.length > 0) {
      detectAndFetchHanja(text, userMsgId);
    }

    // YouTube link detection — auto ingest
    const ytMatch = text.match(YOUTUBE_REGEX);
    if (ytMatch) {
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
          content: data.summary || `영상을 구조화했어요.`,
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
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      streaming: true,
    });

    setStreaming(true);

    try {
      const allMessages = useChatStore.getState().messages;
      const apiMessages = allMessages
        .filter(m => !m.streaming)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        updateMessage(assistantId, {
          content: err.error === 'TOKEN_LIMIT_EXCEEDED'
            ? '오늘 대화 한도에 도달했어요.'
            : '죄송해요, 잠시 후 다시 시도해주세요.',
          streaming: false,
        });
        setStreaming(false);
        return;
      }

      // SSE streaming
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let accumulated = '';
      let nodeInfo: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              accumulated += data.text;
              updateMessage(assistantId, { content: accumulated });
            }
            if (data.done) {
              nodeInfo = {
                domain: data.domain,
                nodeId: data.nodeId,
                confidence: data.confidence,
                domain_data: data.domain_data,
              };
            }
          } catch { /* skip */ }
        }
      }

      updateMessage(assistantId, {
        streaming: false,
        ...(nodeInfo?.domain ? { nodeCreated: nodeInfo } : {}),
      });
    } catch {
      updateMessage(assistantId, {
        content: '연결에 문제가 생겼어요. 다시 시도해주세요.',
        streaming: false,
      });
    } finally {
      setStreaming(false);
    }
  }, [input, isStreaming, addMessage, updateMessage, setStreaming]);

  // ---- Handle file selection ----
  // Auto-send initial message (from Spotlight)
  useEffect(() => {
    if (initialMessage && !autoSentRef.current && !isStreaming) {
      autoSentRef.current = true;
      setInput(initialMessage);
      // Defer to next tick so send() picks up the value
      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.value = initialMessage;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // Directly trigger send
        sendWithText(initialMessage);
        onSent?.();
      }, 50);
    }
  }, [initialMessage, isStreaming, onSent]);

  // Send with explicit text (for auto-send)
  const sendWithText = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput('');
    setRows(1);

    const userMsgId = `u-${Date.now()}`;
    addMessage({ id: userMsgId, role: 'user', content: text.trim(), createdAt: new Date() });

    const assistantId = `a-${Date.now()}`;
    addMessage({ id: assistantId, role: 'assistant', content: '', createdAt: new Date(), streaming: true });
    setStreaming(true);

    try {
      const allMessages = useChatStore.getState().messages;
      const apiMessages = allMessages.filter(m => !m.streaming).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: apiMessages }) });
      if (!res.ok) {
        updateMessage(assistantId, { content: '잠시 후 다시 시도해주세요.', streaming: false });
        setStreaming(false);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let accumulated = '';
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
            if (data.done) { nodeInfo = { domain: data.domain, nodeId: data.nodeId, confidence: data.confidence, domain_data: data.domain_data }; }
          } catch {}
        }
      }
      updateMessage(assistantId, { streaming: false, ...(nodeInfo?.domain ? { nodeCreated: nodeInfo } : {}) });
    } catch {
      updateMessage(assistantId, { content: '연결에 문제가 생겼어요.', streaming: false });
    } finally {
      setStreaming(false);
    }
  }, [isStreaming, addMessage, updateMessage, setStreaming]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    const isYoutube = false; // youtube is text input, not file

    if (isImage) {
      // Show preview + send to OCR
      const preview = URL.createObjectURL(file);
      addMessage({
        id: `u-${Date.now()}`,
        role: 'user',
        content: `[이미지: ${file.name}]`,
        createdAt: new Date(),
        imagePreview: preview,
      });

      const assistantId = `a-${Date.now()}`;
      addMessage({ id: assistantId, role: 'assistant', content: '이미지를 분석하고 있어요...', createdAt: new Date(), streaming: true });
      setStreaming(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/ocr', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.text) {
          updateMessage(assistantId, {
            content: data.text,
            streaming: false,
            ocrResult: { text: data.text, imageType: data.imageType || 'general' },
          });
        } else {
          updateMessage(assistantId, { content: '이미지에서 텍스트를 추출하지 못했어요.', streaming: false });
        }
      } catch {
        updateMessage(assistantId, { content: '이미지 분석에 실패했어요.', streaming: false });
      } finally {
        setStreaming(false);
      }
    } else if (isPDF || file.name.match(/\.(docx?|xlsx?|pptx?|hwp|hwpx|txt|md)$/i)) {
      // File upload
      addMessage({
        id: `u-${Date.now()}`,
        role: 'user',
        content: `[파일: ${file.name}]`,
        createdAt: new Date(),
      });

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
          fileResult: {
            fileType: data.fileType || 'text',
            fileName: file.name,
            pageCount: data.pageCount,
            textContent: data.textContent,
            nodeId: data.nodeId,
          },
        });
      } catch {
        updateMessage(assistantId, { content: '파일 분석에 실패했어요.', streaming: false });
      } finally {
        setStreaming(false);
      }
    }
  }, [addMessage, updateMessage, setStreaming]);

  // ---- YouTube link detection ----
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const lineCount = Math.min(e.target.value.split('\n').length, 6);
    setRows(Math.max(1, lineCount));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt,.md"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {/* Input bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 8px 8px 18px',
        borderRadius: 28,
        border: '2px solid rgba(255,255,255,0.9)',
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 0 16px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.06)',
        transition: '180ms ease',
      }}>
        {/* Attach button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isStreaming}
          title="파일 첨부"
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            opacity: isStreaming ? 0.3 : 0.5,
            transition: '180ms ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={rows}
          placeholder="무엇이든 말해보세요"
          disabled={isStreaming}
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 15, lineHeight: '36px',
            resize: 'none', fontFamily: 'inherit',
            minHeight: 36,
          }}
        />

        {/* Send button */}
        <button
          onClick={send}
          disabled={!input.trim() || isStreaming}
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: input.trim() && !isStreaming ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.06)',
            transition: '180ms ease',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M12 5l7 7-7 7" stroke={input.trim() && !isStreaming ? '#111' : 'rgba(255,255,255,0.15)'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
