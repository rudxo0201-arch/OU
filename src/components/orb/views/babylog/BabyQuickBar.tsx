'use client';

import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useCareSubjectsStore } from '@/stores/careSubjectsStore';

// ── 음성 입력 ──────────────────────────────────────────────────────────
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
          resolve((await res.json()).text ?? null);
        } catch { resolve(null); }
      };
      recorder.start();
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 10000);
      (window as any).__activeRecorder = recorder;
    });
  } catch { return null; }
}
function stopRecorder() {
  const r = (window as any).__activeRecorder as MediaRecorder | undefined;
  if (r?.state === 'recording') r.stop();
}

const SHORTCUTS = [
  { label: '수유', template: '수유 ' },
  { label: '기저귀', template: '기저귀 ' },
  { label: '잠', template: '잠 시작' },
  { label: '기상', template: '잠 깼어' },
  { label: '체온', template: '체온 ' },
  { label: '약', template: '약 먹임 ' },
];

export function BabyQuickBar() {
  const { subjects, activeSubjectName, setActiveSubjectName, setSubjects, setLoaded, loaded } = useCareSubjectsStore();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hasMic, setHasMic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasMic(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (loaded) return;
    fetch('/api/care/subjects')
      .then(r => r.json())
      .then(json => { if (json.subjects) setSubjects(json.subjects); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [loaded, setSubjects, setLoaded]);

  const activeSubject = subjects.find(s => s.name === activeSubjectName) ?? null;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
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

      const json = await res.json();
      if (res.ok && json.ok) {
        setText('');
        window.dispatchEvent(new CustomEvent('ou-node-created', { detail: { domain: 'care' } }));
        showToast('기록됐어요');

        // LLM이 이름을 추출했고 등록된 이름이면 탭 자동 전환
        if (json.subjectName) {
          const isKnown = subjects.some(s => s.name === json.subjectName);
          if (isKnown) setActiveSubjectName(json.subjectName);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  const cardStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: 16,
    padding: '12px 16px',
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  return (
    <>
      <div style={cardStyle}>
        {/* 단축 버튼 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {SHORTCUTS.map(s => (
            <button key={s.label} onClick={() => { setText(s.template); inputRef.current?.focus(); }}
              style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, border: '1px solid rgba(0,0,0,0.12)', background: 'transparent', color: 'var(--ou-text-secondary)', cursor: 'pointer' }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* 안내 문구 */}
        {!activeSubjectName && (
          <p style={{ fontSize: 12, color: 'var(--ou-text-muted)', marginBottom: 8, marginTop: -2 }}>
            이름을 꼭 말해주세요 —{' '}
            <span style={{ color: 'var(--ou-text-secondary)' }}>
              {subjects.slice(0, 2).map((s, i) => (
                <span key={s.name}>{i > 0 && ' · '}{s.name} 120ml</span>
              ))}
            </span>
          </p>
        )}

        {/* 입력창 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeSubjectName && (
            <span style={{ padding: '4px 10px', borderRadius: 9999, background: 'rgba(0,0,0,0.88)', color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {activeSubjectName}
            </span>
          )}
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder={activeSubjectName ? `${activeSubjectName} 기록 입력` : subjects.map(s => s.name).join(', ') + ' 중 누구의 기록인지 말해보세요'}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 10, fontSize: 14, outline: 'none', background: 'rgba(0,0,0,0.02)' }}
          />
          {hasMic && (
            <button
              onPointerDown={async () => { setRecording(true); const t = await recordAndTranscribe(); setRecording(false); if (t) { setText(t); setTimeout(() => inputRef.current?.focus(), 50); } else showToast('음성 인식에 실패했어요'); }}
              onPointerUp={() => { setRecording(false); stopRecorder(); }}
              onPointerLeave={() => { setRecording(false); stopRecorder(); }}
              style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.12)', background: recording ? 'rgba(0,0,0,0.88)' : 'transparent', color: recording ? '#fff' : 'var(--ou-text-secondary)', fontSize: 16, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {recording ? '●' : '🎤'}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
            style={{ padding: '8px 16px', borderRadius: 10, background: text.trim() ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.10)', color: text.trim() ? '#fff' : 'rgba(0,0,0,0.3)', border: 'none', cursor: text.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {submitting ? '...' : '기록'}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.82)', color: '#fff', padding: '8px 20px', borderRadius: 9999, fontSize: 13, fontWeight: 500, zIndex: 500, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </>
  );
}
