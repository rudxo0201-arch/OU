'use client';

import { useState } from 'react';
import { Heartbeat, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const HEALTH_PATTERN = /두통|운동|약|병원|컨디션|수면|식단|체중|혈압|스트레스|감기|열|배아파|허리|목아파|피곤|불면|소화/;

const SYMPTOM_MAP: Record<string, string> = {
  두통: '두통', 머리: '두통', 목아파: '목 통증', 목: '목 통증',
  배아파: '복통', 배: '복통', 허리: '허리 통증', 감기: '감기',
  열: '발열', 피곤: '피로', 불면: '불면', 수면: '수면 문제',
  소화: '소화 불량', 운동: '운동', 약: '복약', 병원: '병원 방문',
  컨디션: '컨디션', 식단: '식단', 체중: '체중', 혈압: '혈압', 스트레스: '스트레스',
};

const BODY_PARTS = ['머리', '목', '배', '등', '허리', '팔', '다리', '전신'];

const SEVERITY_LEVELS = [
  { value: 1, color: '#e0e0e0' },
  { value: 2, color: '#b0b0b0' },
  { value: 3, color: '#808080' },
  { value: 4, color: '#505050' },
  { value: 5, color: '#1a1a1a' },
];

function parseHealth(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const [keyword, symptom] of Object.entries(SYMPTOM_MAP)) {
    if (input.includes(keyword)) { parsed.symptom = symptom; break; }
  }
  for (const part of BODY_PARTS) {
    if (input.includes(part)) { parsed.bodyPart = part; break; }
  }
  if (/심한|너무|정말|진짜|엄청|매우/.test(input)) parsed.severity = '5';
  else if (/꽤|상당히|많이/.test(input)) parsed.severity = '4';
  else if (/좀|약간|살짝|조금/.test(input)) parsed.severity = '2';
  return parsed;
}

export function HealthTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [selectedSeverity, setSelectedSeverity] = useState<number | null>(
    parsed.severity ? parseInt(parsed.severity) : null,
  );
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(parsed.bodyPart ?? null);
  const [memo, setMemo] = useState('');
  const [showMemo, setShowMemo] = useState(false);

  const symptomLabel = parsed.symptom ?? '건강';
  const isDone = selectedSeverity !== null;

  return (
    <div
      style={{
        marginTop: 8, border: '0.5px solid var(--color-default-border)',
        borderRadius: 8, overflow: 'hidden', animation: 'ou-fade-in 300ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--color-default-border)' }}>
        <Heartbeat size={14} weight="fill" />
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>건강</span>
        {isDone && <Check size={12} style={{ color: '#22c55e' }} />}
      </div>

      <div style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>증상</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{symptomLabel}</span>
          </div>
          {selectedSeverity && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>정도</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {SEVERITY_LEVELS.map(level => (
                  <div key={level.value} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: level.value <= selectedSeverity ? level.color : 'transparent',
                    border: `1px solid ${level.color}`,
                  }} />
                ))}
              </div>
            </div>
          )}
          {selectedBodyPart && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>부위</span>
              <span style={{ fontSize: 14 }}>{selectedBodyPart}</span>
            </div>
          )}
          {memo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>메모</span>
              <span style={{ fontSize: 14 }}>{memo}</span>
            </div>
          )}
        </div>
      </div>

      {!selectedSeverity && (
        <div style={{ padding: '0 12px 8px' }}>
          <span style={{ fontSize: 10, color: 'var(--color-dimmed)', display: 'block', marginBottom: 6 }}>어느 정도인가요?</span>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {SEVERITY_LEVELS.map(level => (
              <button key={level.value} onClick={() => { setSelectedSeverity(level.value); onSubmit(`정도: ${level.value}/5`); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${level.color}`, transition: 'transform 150ms' }} />
                <span style={{ fontSize: 9, color: 'var(--color-dimmed)' }}>{level.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSeverity && !selectedBodyPart && (
        <div style={{ padding: '0 12px 8px' }}>
          <span style={{ fontSize: 10, color: 'var(--color-dimmed)', display: 'block', marginBottom: 6 }}>어디가 불편한가요?</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BODY_PARTS.map(part => (
              <button key={part} onClick={() => { setSelectedBodyPart(part); onSubmit(`부위: ${part}`); }}
                style={{ padding: '3px 10px', borderRadius: 14, fontSize: 12, border: '0.5px solid var(--color-default-border)', background: 'none', cursor: 'pointer', transition: 'all 150ms' }}>
                {part}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSeverity && selectedBodyPart && !memo && !showMemo && (
        <div style={{ padding: '0 12px 8px' }}>
          <button onClick={() => setShowMemo(true)}
            style={{ padding: '3px 10px', borderRadius: 14, fontSize: 12, border: '0.5px solid var(--color-default-border)', color: 'var(--color-dimmed)', background: 'none', cursor: 'pointer' }}>
            + 메모 추가
          </button>
        </div>
      )}

      {showMemo && !memo && (
        <div style={{ padding: '0 12px 8px' }}>
          <input type="text" placeholder="추가로 기록할 내용이 있나요?" autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                const val = (e.target as HTMLInputElement).value.trim();
                setMemo(val); onSubmit(`메모: ${val}`); setShowMemo(false);
              }
            }}
            style={{ width: '100%', padding: '4px 8px', fontSize: 12, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--color-default-border)', boxSizing: 'border-box' }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderTop: '0.5px solid var(--color-default-border)' }}>
        <button onClick={() => router.push('/my')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-dimmed)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          내 우주에서 보기 <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

registerTool({
  id: 'health',
  label: '건강',
  match: (input, _domain) => HEALTH_PATTERN.test(input),
  parse: parseHealth,
  component: HealthTool,
});
