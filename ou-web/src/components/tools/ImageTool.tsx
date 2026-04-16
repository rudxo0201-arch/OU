'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

// 이미지에서 추출된 텍스트를 분석해 어떤 종류인지 감지
function detectImageType(text: string): 'timetable' | 'receipt' | 'document' | 'general' {
  if (/월|화|수|목|금|토|일|교시|시간표|주차/.test(text) && /\d{1,2}:\d{2}/.test(text)) return 'timetable';
  if (/합계|총액|결제|카드|현금|영수증/.test(text)) return 'receipt';
  if (/제\d+조|제\d+장|목차|서론|결론/.test(text)) return 'document';
  return 'general';
}

interface TimetableEntry {
  day: string;
  subject: string;
  time: string;
  professor?: string;
}

function parseTimetableText(text: string): TimetableEntry[] {
  const entries: TimetableEntry[] = [];
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const lines = text.split('\n');

  let currentDay = '';
  for (const line of lines) {
    // 요일 감지
    for (const day of days) {
      if (line.includes(`${day}(`) || line.includes(`${day}요일`)) {
        currentDay = day;
      }
    }

    // 시간 + 과목명 패턴
    const timeMatch = line.match(/(\d{1,2}:\d{2})\s*[~\-]\s*(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const subject = line.replace(timeMatch[0], '').trim().split('\n')[0];
      if (subject && subject.length > 1) {
        entries.push({
          day: currentDay || '?',
          subject: subject.replace(/[,\s]+$/, ''),
          time: `${timeMatch[1]}~${timeMatch[2]}`,
        });
      }
    }
  }

  return entries;
}

export function ImageTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [ocrText, setOcrText] = useState(parsed._ocrText ?? '');
  const [imageType, setImageType] = useState(parsed._imageType ?? 'general');
  const [loading, setLoading] = useState(!parsed._ocrText);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [missingFields, setMissingFields] = useState<{ key: string; label: string; options?: string[] }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  useEffect(() => {
    if (ocrText) {
      const type = detectImageType(ocrText);
      setImageType(type);

      if (type === 'timetable') {
        const parsed = parseTimetableText(ocrText);
        setEntries(parsed);
        setMissingFields([
          { key: 'grade', label: '학년', options: ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년'] },
          { key: 'location', label: '강의실' },
          { key: 'repeat', label: '매주 반복인가요?', options: ['네, 매주 같아요', '이번 주만이요'] },
        ]);
      } else if (type === 'receipt') {
        setMissingFields([
          { key: 'category', label: '카테고리', options: ['식비', '교통', '쇼핑', '문화', '의료', '기타'] },
        ]);
      }
    }
  }, [ocrText]);

  const handleAnswer = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    onSubmit(`${key}: ${value}`);
  };

  const totalEntries = entries.length || '여러';

  return (
    <div
      style={{
        marginTop: 8,
        border: '0.5px solid var(--color-default-border)',
        borderRadius: 8,
        overflow: 'hidden',
        animation: 'ou-fade-in 300ms ease',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderBottom: '0.5px solid var(--color-default-border)',
        }}
      >
        <ImageIcon size={14} weight="fill" />
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>
          {imageType === 'timetable' ? '시간표' : imageType === 'receipt' ? '영수증' : '이미지'} 인식 완료
        </span>
        {Object.keys(answers).length >= missingFields.length && missingFields.length > 0 && (
          <Check size={12} style={{ color: '#22c55e' }} />
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-dimmed)' }}>이미지를 읽고 있어요...</span>
        </div>
      )}

      {/* 시간표: 요약 */}
      {imageType === 'timetable' && entries.length > 0 && (
        <div style={{ padding: '8px 12px' }}>
          <span style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 8 }}>
            {totalEntries}개 수업을 읽었어요
          </span>

          {/* 미니 시간표 뷰 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: 8 }}>
            {['월', '화', '수', '목', '금'].map(day => {
              const dayEntries = entries.filter(e => e.day === day);
              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', color: 'var(--color-dimmed)' }}>{day}</span>
                  {dayEntries.length > 0 ? dayEntries.slice(0, 3).map((e, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '2px 4px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 4,
                        border: '0.5px solid var(--color-default-border)',
                      }}
                    >
                      <span style={{ fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{e.subject}</span>
                    </div>
                  )) : (
                    <span style={{ fontSize: 9, color: 'var(--color-dimmed)', textAlign: 'center' }}>-</span>
                  )}
                  {dayEntries.length > 3 && (
                    <span style={{ fontSize: 8, color: 'var(--color-dimmed)', textAlign: 'center' }}>+{dayEntries.length - 3}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 영수증/일반: 텍스트 요약 */}
      {imageType !== 'timetable' && ocrText && (
        <div style={{ padding: '8px 12px' }}>
          <span style={{ fontSize: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{ocrText.slice(0, 200)}</span>
        </div>
      )}

      {/* 확인 필요 필드들 */}
      {missingFields.length > 0 && (
        <div style={{ padding: '0 12px 8px' }}>
          {missingFields.filter(f => !answers[f.key]).length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--color-dimmed)', display: 'block', marginBottom: 6 }}>확인이 필요해요</span>
          )}

          {missingFields.map(field => {
            if (answers[field.key]) {
              return (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>{field.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{answers[field.key]}</span>
                </div>
              );
            }

            if (field.options) {
              return (
                <div key={field.key} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>{field.label}</span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {field.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleAnswer(field.key, opt)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 14,
                          fontSize: 12,
                          border: '0.5px solid var(--color-default-border)',
                          color: 'var(--color-dimmed)',
                          background: 'none',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={field.key} style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>{field.label}</span>
                {editingField === field.key ? (
                  <input
                    type="text"
                    placeholder={`${field.label} 입력`}
                    value={fieldValue}
                    onChange={e => setFieldValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && fieldValue.trim()) {
                        handleAnswer(field.key, fieldValue);
                        setFieldValue('');
                        setEditingField(null);
                      }
                    }}
                    autoFocus
                    style={{
                      width: '100%', padding: '4px 8px', fontSize: 12, borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid var(--color-default-border)',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <button
                    onClick={() => { setEditingField(field.key); setFieldValue(''); }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 14,
                      fontSize: 12,
                      border: '0.5px solid var(--color-default-border)',
                      color: 'var(--color-dimmed)',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    + {field.label} 입력
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 하단 */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderTop: '0.5px solid var(--color-default-border)' }}
      >
        <button
          onClick={() => router.push('/my')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-dimmed)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          내 우주에서 보기 <ArrowRight size={11} />
        </button>
        {entries.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--color-dimmed)' }}>{entries.length}개 기록 예정</span>
        )}
      </div>
    </div>
  );
}

// Registry 등록
registerTool({
  id: 'image',
  label: '이미지',
  match: (input) => /\[이미지:/.test(input),
  parse: (input) => ({ _rawInput: input }),
  component: ImageTool,
});
