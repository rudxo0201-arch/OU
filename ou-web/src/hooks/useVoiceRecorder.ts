'use client';

import { useState, useRef, useCallback } from 'react';

export type VoiceStatus = 'idle' | 'recording' | 'transcribing';

interface UseVoiceRecorderOptions {
  /** 녹음 완료 후 변환된 텍스트 콜백 */
  onTranscript: (text: string) => void;
  /** 에러 콜백 */
  onError?: (message: string) => void;
}

export function useVoiceRecorder({ onTranscript, onError }: UseVoiceRecorderOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [duration, setDuration] = useState(0);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorder.current = null;
    chunks.current = [];
    setDuration(0);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });

        // 너무 짧은 녹음 무시 (0.5초 미만)
        if (blob.size < 1000) {
          cleanup();
          setStatus('idle');
          return;
        }

        setStatus('transcribing');

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');

          const res = await fetch('/api/voice', { method: 'POST', body: formData });
          const data = await res.json();

          if (data.error) {
            onError?.(data.error);
          } else if (data.text?.trim()) {
            onTranscript(data.text.trim());
          }
        } catch {
          onError?.('음성 변환에 실패했어요.');
        }

        cleanup();
        setStatus('idle');
      };

      recorder.start(250); // 250ms 청크
      setStatus('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch {
      onError?.('마이크 접근이 허용되지 않았어요.');
      cleanup();
      setStatus('idle');
    }
  }, [onTranscript, onError, cleanup]);

  const stop = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      // onstop 콜백 제거 → 전송하지 않음
      mediaRecorder.current.onstop = null;
      mediaRecorder.current.stop();
    }
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  return { status, duration, start, stop, cancel };
}
