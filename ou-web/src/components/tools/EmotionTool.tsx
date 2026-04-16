'use client';

import { useState } from 'react';
import { Smiley, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const EMOTION_MAP: Record<string, string> = {
  행복: '행복', 기쁘: '행복', 좋: '행복', 즐거: '행복', 신나: '행복',
  설레: '설렘', 감사: '감사', 고마: '감사', 슬프: '슬픔', 슬퍼: '슬픔',
  우울: '우울', 외로: '외로움', 화나: '분노', 짜증: '분노', 열받: '분노',
  불안: '불안', 걱정: '불안', 긴장: '불안', 초조: '불안', 스트레스: '스트레스',
  지치: '피곤', 피곤: '피곤', 힘들: '피곤', 편안: '평온', 평화: '평온', 차분: '평온',
};

const INTENSITY_LEVELS = [
  { value: 1, label: '조금', color: '#d0d0d0' },
  { value: 2, label: '약간', color: '#a0a0a0' },
  { value: 3, label: '보통', color: '#707070' },
  { value: 4, label: '꽤', color: '#404040' },
  { value: 5, label: '많이', color: '#1a1a1a' },
];

function parseEmotion(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const [keyword, emotion] of Object.entries(EMOTION_MAP)) {
    if (input.includes(keyword)) { parsed.emotion = emotion; break; }
  }
  if (/너무|정말|진짜|완전|엄청|매우/.test(input)) parsed.intensity = '5';
  else if (/꽤|상당히|많이/.test(input)) parsed.intensity = '4';
  else if (/조금|살짝|약간/.test(input)) parsed.intensity = '2';
  const causeMatch = input.match(/(.{2,20})(때문에|때문이야|해서|라서|덕분에|탓에)/);
  if (causeMatch) parsed.cause = causeMatch[1].trim();
  return parsed;
}

export function EmotionTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [selectedIntensity, setSelectedIntensity] = useState<number | null>(
    parsed.intensity ? parseInt(parsed.intensity) : null,
  );
  const [cause, setCause] = useState(parsed.cause ?? '');
  const [showCauseInput, setShowCauseInput] = useState(false);

  const emotionLabel = parsed.emotion ?? '기분';
  const isDone = selectedIntensity !== null;

  return (
    <div style={{ marginTop: 8, border: '0.5px solid var(--color-default-border)', borderRadius: 8, overflow: 'hidden', animation: 'ou-fade-in 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--color-default-border)' }}>
        <Smiley size={14} weight="fill" />
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>감정</span>
        {isDone && <Check size={12} style={{ color: '#22c55e' }} />}
      </div>

      <div style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>감정</span><span style={{ fontSize: 14, fontWeight: 600 }}>{emotionLabel}</span></div>
          {selectedIntensity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>정도</span><span style={{ fontSize: 14 }}>{INTENSITY_LEVELS.find(l => l.value === selectedIntensity)?.label}</span></div>
          )}
          {cause && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>이유</span><span style={{ fontSize: 14 }}>{cause}</span></div>
          )}
        </div>
      </div>

      {!selectedIntensity && (
        <div style={{ padding: '0 12px 8px' }}>
          <span style={{ fontSize: 10, color: 'var(--color-dimmed)', display: 'block', marginBottom: 6 }}>어느 정도인가요?</span>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {INTENSITY_LEVELS.map(level => (
              <button key={level.value} onClick={() => { setSelectedIntensity(level.value); onSubmit(`강도: ${level.label}`); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: level.color, border: '0.5px solid var(--color-default-border)', transition: 'transform 150ms' }} />
                <span style={{ fontSize: 9, color: 'var(--color-dimmed)' }}>{level.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedIntensity && !cause && !showCauseInput && (
        <div style={{ padding: '0 12px 8px' }}>
          <button onClick={() => setShowCauseInput(true)}
            style={{ padding: '3px 10px', borderRadius: 14, fontSize: 12, border: '0.5px solid var(--color-default-border)', color: 'var(--color-dimmed)', background: 'none', cursor: 'pointer' }}>
            + 이유 적기
          </button>
        </div>
      )}

      {showCauseInput && !cause && (
        <div style={{ padding: '0 12px 8px' }}>
          <input type="text" placeholder="어떤 일이 있었나요?" autoFocus
            onChange={e => setCause(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                const val = (e.target as HTMLInputElement).value.trim();
                setCause(val); onSubmit(`이유: ${val}`); setShowCauseInput(false);
              }
            }}
            style={{ width: '100%', padding: '4px 8px', fontSize: 12, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--color-default-border)', boxSizing: 'border-box' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderTop: '0.5px solid var(--color-default-border)' }}>
        <button onClick={() => router.push('/my')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-dimmed)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          내 우주에서 보기 <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

registerTool({ id: 'emotion', label: '감정', match: (_input, domain) => domain === 'emotion', parse: parseEmotion, component: EmotionTool });
