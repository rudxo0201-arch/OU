'use client';

import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useCareSubjectsStore } from '@/stores/careSubjectsStore';
import type { CareSubject } from '@/stores/careSubjectsStore';

async function recordAndTranscribe(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new Promise((resolve) => {
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('audio', blob, 'voice.webm');
        try {
          const res = await fetch('/api/voice', { method: 'POST', body: fd });
          const json = await res.json();
          resolve(json.text ?? null);
        } catch { resolve(null); }
      };
      recorder.start();
      // 최대 10초 후 자동 종료
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 10000);
      (window as any).__activeRecorder = recorder;
    });
  } catch {
    return null;
  }
}

function stopRecorder() {
  const r = (window as any).__activeRecorder as MediaRecorder | undefined;
  if (r && r.state === 'recording') r.stop();
}

const SHORTCUTS = [
  { label: '수유', template: '수유 ' },
  { label: '기저귀', template: '기저귀 ' },
  { label: '잠', template: '잠 시작' },
  { label: '기상', template: '잠 깼어' },
  { label: '체온', template: '체온 ' },
  { label: '약', template: '약 먹임 ' },
];

function AddSubjectModal({ onAdd, onClose }: { onAdd: (s: CareSubject) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/care/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_type: 'child', name: name.trim() }),
      });
      const json = await res.json();
      if (json.subject) {
        onAdd(json.subject);
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const overlayStyle: CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 999,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const boxStyle: CSSProperties = {
    background: '#fff', borderRadius: 16, padding: 24, width: 320,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--ou-text-heading)' }}>
          아이 추가
        </p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="이름 또는 호칭 (예: 첫째, 둘째)"
          style={{
            width: '100%', padding: '8px 12px',
            border: '1px solid rgba(0,0,0,0.14)', borderRadius: 8,
            fontSize: 14, outline: 'none', boxSizing: 'border-box',
            marginBottom: 12,
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>취소</button>
          <button onClick={handleSubmit} disabled={submitting || !name.trim()} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.88)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !name.trim() ? 0.4 : 1 }}>추가</button>
        </div>
      </div>
    </div>
  );
}

export function BabyQuickBar() {
  const { subjects, activeSubjectName, setActiveSubjectName, addSubject, setSubjects, setLoaded, loaded } = useCareSubjectsStore();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasMic(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (loaded) return;
    fetch('/api/care/subjects')
      .then(r => r.json())
      .then(json => {
        if (json.subjects) setSubjects(json.subjects);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [loaded, setSubjects, setLoaded]);

  const activeSubject = subjects.find(s => s.name === activeSubjectName) ?? null;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function applyShortcut(template: string) {
    setText(template);
    inputRef.current?.focus();
  }

  async function handleSubmit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const context = activeSubject
        ? { subject_type: activeSubject.subject_type, subject_name: activeSubject.name }
        : undefined;

      const res = await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), domainHint: 'care', ...(context ? { context } : {}) }),
      });

      if (res.ok) {
        setText('');
        window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain: 'care' } }));
        showToast('기록됐어요');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const wrapStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: 16,
    padding: '12px 16px',
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  const shortcutRowStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  };

  const shortcutBtnStyle: CSSProperties = {
    padding: '4px 12px',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid rgba(0,0,0,0.12)',
    background: 'transparent',
    color: 'var(--ou-text-secondary)',
    cursor: 'pointer',
    transition: 'all 100ms ease',
    userSelect: 'none',
  };

  const inputRowStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid rgba(0,0,0,0.10)',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    background: 'rgba(0,0,0,0.02)',
    color: 'var(--ou-text-heading)',
  };

  const subjectLabel = activeSubjectName ?? '전체';
  const placeholderText = activeSubjectName
    ? `${activeSubjectName}의 기록을 입력하세요`
    : '수유, 기저귀, 체온 등 아무거나 말해보세요';

  return (
    <>
      {showAddModal && (
        <AddSubjectModal
          onAdd={s => { addSubject(s); setActiveSubjectName(s.name); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
      <div style={wrapStyle}>
        {/* 단축 버튼 */}
        <div style={shortcutRowStyle}>
          {SHORTCUTS.map(s => (
            <button
              key={s.label}
              style={shortcutBtnStyle}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; }}
              onClick={() => applyShortcut(s.template)}
            >
              {s.label}
            </button>
          ))}
          <button
            style={{ ...shortcutBtnStyle, marginLeft: 'auto', borderStyle: 'dashed' }}
            onClick={() => setShowAddModal(true)}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; }}
          >
            + 아이 추가
          </button>
        </div>

        {/* 입력창 + 아이 라벨 + 전송 */}
        <div style={inputRowStyle}>
          {activeSubjectName && (
            <span style={{
              padding: '4px 10px', borderRadius: 9999,
              background: 'rgba(0,0,0,0.88)', color: '#fff',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              {subjectLabel}
            </span>
          )}
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder={placeholderText}
            style={inputStyle}
          />
          {hasMic && (
            <button
              onPointerDown={async () => {
                setRecording(true);
                const transcript = await recordAndTranscribe();
                setRecording(false);
                if (transcript) {
                  setText(transcript);
                  setTimeout(() => inputRef.current?.focus(), 50);
                } else {
                  showToast('음성 인식에 실패했어요');
                }
              }}
              onPointerUp={() => { setRecording(false); stopRecorder(); }}
              onPointerLeave={() => { setRecording(false); stopRecorder(); }}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                border: '1px solid rgba(0,0,0,0.12)',
                background: recording ? 'rgba(0,0,0,0.88)' : 'transparent',
                color: recording ? '#fff' : 'var(--ou-text-secondary)',
                fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 120ms ease',
                flexShrink: 0,
              }}
              title="눌러서 음성 입력"
            >
              {recording ? '●' : '🎤'}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            style={{
              padding: '8px 16px', borderRadius: 10,
              background: text.trim() ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.10)',
              color: text.trim() ? '#fff' : 'rgba(0,0,0,0.3)',
              border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              fontSize: 13, fontWeight: 600,
              transition: 'all 120ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {submitting ? '...' : '기록'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.82)', color: '#fff',
          padding: '8px 20px', borderRadius: 9999,
          fontSize: 13, fontWeight: 500, zIndex: 500,
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
