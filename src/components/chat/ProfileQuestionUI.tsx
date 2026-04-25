'use client';

import { useState } from 'react';
import { OuButton, OuCard } from '@/components/ds';
import { useTutorialStore } from '@/stores/tutorialStore';

const JOBS = ['학생', '직장인', '자영업', '프리랜서'];
const INTERESTS = ['운동', '독서', '요리', '투자', '음악', '여행', '게임', '사진'];
const PURPOSES = ['일정관리', '가계부', '공부', '일기', '업무', '취미'];

interface ProfileAnswers {
  job: string;
  interests: string[];
  purposes: string[];
  customJob?: string;
}

interface Props {
  /** OU 추측값 (1~6단계 대화 기반) */
  initialGuess?: Partial<ProfileAnswers>;
  onSubmit: (answers: ProfileAnswers) => void;
  onSkip: () => void;
}

export function ProfileQuestionUI({ initialGuess, onSubmit, onSkip }: Props) {
  const [job, setJob] = useState(initialGuess?.job ?? '');
  const [customJob, setCustomJob] = useState('');
  const [interests, setInterests] = useState<string[]>(initialGuess?.interests ?? []);
  const [purposes, setPurposes] = useState<string[]>(initialGuess?.purposes ?? []);

  const toggleInterest = (v: string) =>
    setInterests(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const togglePurpose = (v: string) =>
    setPurposes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const handleSubmit = () => {
    onSubmit({
      job: job === '기타' ? customJob : job,
      interests,
      purposes,
    });
  };

  return (
    <OuCard variant="pressed" size="sm" style={{ marginTop: 16, animation: 'ou-fade-in 0.4s ease' }}>
      <div style={{ fontSize: 10, color: 'var(--ou-text-muted)', letterSpacing: 1, marginBottom: 16 }}>PROFILE</div>

      {/* 직업 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)', marginBottom: 8 }}>직업이 뭐예요?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[...JOBS, '기타'].map(j => (
            <OuButton
              key={j}
              size="sm"
              variant={job === j ? 'ghost' : 'default'}
              onClick={() => setJob(j)}
              style={{
                fontSize: 12,
                boxShadow: job === j ? 'var(--ou-neu-pressed-sm)' : undefined,
              }}
            >
              {j}
            </OuButton>
          ))}
        </div>
        {job === '기타' && (
          <input
            value={customJob}
            onChange={e => setCustomJob(e.target.value)}
            placeholder="직접 입력..."
            style={{
              marginTop: 8, width: '100%', padding: '7px 12px',
              borderRadius: 20, border: 'none',
              background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-pressed-sm)',
              fontSize: 13, color: 'var(--ou-text-body)', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        )}
      </div>

      {/* 관심사 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)', marginBottom: 8 }}>관심사는? (복수 선택)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {INTERESTS.map(i => (
            <OuButton
              key={i}
              size="sm"
              variant={interests.includes(i) ? 'ghost' : 'default'}
              onClick={() => toggleInterest(i)}
              style={{
                fontSize: 12,
                boxShadow: interests.includes(i) ? 'var(--ou-neu-pressed-sm)' : undefined,
              }}
            >
              {i}
            </OuButton>
          ))}
        </div>
      </div>

      {/* 주 사용 목적 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--ou-text-secondary)', marginBottom: 8 }}>OU를 주로 어디에 쓰고 싶어요? (복수 선택)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PURPOSES.map(p => (
            <OuButton
              key={p}
              size="sm"
              variant={purposes.includes(p) ? 'ghost' : 'default'}
              onClick={() => togglePurpose(p)}
              style={{
                fontSize: 12,
                boxShadow: purposes.includes(p) ? 'var(--ou-neu-pressed-sm)' : undefined,
              }}
            >
              {p}
            </OuButton>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onSkip}
          style={{ fontSize: 12, color: 'var(--ou-text-disabled)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          건너뛰기
        </button>
        <OuButton size="sm" onClick={handleSubmit}>
          완료
        </OuButton>
      </div>
    </OuCard>
  );
}
