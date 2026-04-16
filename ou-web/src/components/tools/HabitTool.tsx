'use client';

import { useState } from 'react';
import { Repeat, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const FREQUENCIES = ['매일', '주 2회', '주 3회', '주 5회', '월 2회', '월 4회'];
const TIME_OF_DAY = ['아침', '점심', '저녁', '자유'];

function parseHabit(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const habitPatterns = [/매일\s+(.{2,10})/, /(.{2,10})\s*(습관|루틴)/, /(.{2,10})\s*(하기|하려고|할래|시작)/];
  for (const pattern of habitPatterns) {
    const match = input.match(pattern);
    if (match) { parsed.habit = match[1].trim(); break; }
  }
  if (!parsed.habit) {
    const knownHabits = input.match(/(운동|독서|물\s?마시기|명상|스트레칭|영어|일기|산책|조깅|러닝|요가|필라테스|코딩|공부|수영|자전거)/);
    if (knownHabits) parsed.habit = knownHabits[1];
  }
  if (/매일|매일매일|하루도/.test(input)) parsed.frequency = '매일';
  else {
    const weekMatch = input.match(/주\s*(\d)\s*회/);
    if (weekMatch) parsed.frequency = `주 ${weekMatch[1]}회`;
    const monthMatch = input.match(/월\s*(\d)\s*회/);
    if (monthMatch) parsed.frequency = `월 ${monthMatch[1]}회`;
  }
  if (/아침|기상|일어나/.test(input)) parsed.timeOfDay = '아침';
  else if (/점심|낮/.test(input)) parsed.timeOfDay = '점심';
  else if (/저녁|밤|자기\s*전|퇴근/.test(input)) parsed.timeOfDay = '저녁';
  return parsed;
}

export function HabitTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [localParsed] = useState(parsed);
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(parsed.frequency ?? null);
  const [selectedTime, setSelectedTime] = useState<string | null>(parsed.timeOfDay ?? null);

  const today = new Date();
  const startDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const allFilled = !!selectedFrequency && !!selectedTime;

  return (
    <div style={{ marginTop: 8, border: '0.5px solid var(--color-default-border)', borderRadius: 8, overflow: 'hidden', animation: 'ou-fade-in 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--color-default-border)' }}>
        <Repeat size={14} weight="fill" />
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>습관</span>
        {allFilled && <Check size={12} style={{ color: '#22c55e' }} />}
      </div>

      <div style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {localParsed.habit && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>습관</span><span style={{ fontSize: 14, fontWeight: 600 }}>{localParsed.habit}</span></div>}
          {selectedFrequency && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>빈도</span><span style={{ fontSize: 14 }}>{selectedFrequency}</span></div>}
          {selectedTime && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>시간대</span><span style={{ fontSize: 14 }}>{selectedTime}</span></div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>시작일</span><span style={{ fontSize: 14 }}>{startDate}</span></div>
          {!localParsed.habit && <span style={{ fontSize: 14 }}>{rawInput}</span>}
        </div>
      </div>

      {!selectedFrequency && (
        <div style={{ padding: '0 12px 8px' }}>
          <span style={{ fontSize: 10, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>얼마나 자주 하실 건가요?</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {FREQUENCIES.map(freq => (
              <button key={freq} onClick={() => { setSelectedFrequency(freq); onSubmit(`빈도: ${freq}`); }}
                style={{ padding: '2px 10px', borderRadius: 14, fontSize: 11, border: '0.5px solid var(--color-default-border)', color: 'var(--color-dimmed)', background: 'none', cursor: 'pointer' }}>{freq}</button>
            ))}
          </div>
        </div>
      )}

      {selectedFrequency && !selectedTime && (
        <div style={{ padding: '0 12px 8px' }}>
          <span style={{ fontSize: 10, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>언제 하실 건가요?</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {TIME_OF_DAY.map(time => (
              <button key={time} onClick={() => { setSelectedTime(time); onSubmit(`시간대: ${time}`); }}
                style={{ padding: '2px 10px', borderRadius: 14, fontSize: 11, border: '0.5px solid var(--color-default-border)', color: 'var(--color-dimmed)', background: 'none', cursor: 'pointer' }}>{time}</button>
            ))}
          </div>
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

registerTool({ id: 'habit', label: '습관', match: (_input, domain) => domain === 'habit', parse: parseHabit, component: HabitTool });
