'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, ChatTeardrop, User, MapPin, Clock, Cube, ArrowRight,
  SkipForward, Keyboard, Check,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

interface UnresolvedEntity {
  id: string;
  raw_text: string;
  context_snippet: string | Array<{ role: string; text: string }> | null;
  entity_type?: string;
  candidates?: string[];
  placeholder_node_id?: string;
}

interface AccuracyClientProps {
  entities: UnresolvedEntity[];
}

const ENTITY_CONFIG: Record<string, {
  icon: React.ElementType;
  question: string;
  defaults: string[];
}> = {
  person: {
    icon: User,
    question: '이 사람이 누구예요?',
    defaults: ['친구', '직장 동료', '가족', '지인'],
  },
  location: {
    icon: MapPin,
    question: '이곳이 어디예요?',
    defaults: ['집', '회사', '학교', '카페'],
  },
  time: {
    icon: Clock,
    question: '정확한 날짜가 언제예요?',
    defaults: ['오늘', '어제', '지난주', '지난달'],
  },
  thing: {
    icon: Cube,
    question: '이게 무엇이에요?',
    defaults: ['물건', '문서', '음식', '앱'],
  },
  event: {
    icon: Clock,
    question: '이 일이 무엇이에요?',
    defaults: ['약속', '회의', '사건', '대화'],
  },
};

function getEntityConfig(entity: UnresolvedEntity) {
  const type = entity.entity_type ?? 'thing';
  return ENTITY_CONFIG[type] ?? ENTITY_CONFIG.thing;
}

function parseContext(snippet: UnresolvedEntity['context_snippet']): Array<{ role: string; text: string }> {
  if (!snippet) return [];
  if (Array.isArray(snippet)) return snippet;
  // If it's a plain string, wrap it
  if (typeof snippet === 'string') {
    try {
      const parsed = JSON.parse(snippet);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // plain text
    }
    return [{ role: 'user', text: snippet }];
  }
  return [];
}

export function AccuracyClient({ entities: initialEntities }: AccuracyClientProps) {
  const router = useRouter();
  const [entities] = useState(initialEntities);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [resolving, setResolving] = useState(false);
  const [slideIn, setSlideIn] = useState(true);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [showCheckmark, setShowCheckmark] = useState(false);

  const current = entities[currentIdx];
  const progress = entities.length > 0
    ? Math.round((currentIdx / entities.length) * 100)
    : 100;

  // 정확도 계산: 해결된 수 / 전체 수
  const nextAccuracy = entities.length > 0
    ? Math.round(((resolvedCount + 1) / entities.length) * 100)
    : 100;
  const currentResolvedAccuracy = entities.length > 0
    ? Math.round((resolvedCount / entities.length) * 100)
    : 100;

  const advanceToNext = useCallback(() => {
    setSlideIn(false);
    setTimeout(() => {
      setCurrentIdx(i => i + 1);
      setCustomInput('');
      setSlideIn(true);
      setShowCheckmark(false);
    }, 200);
  }, []);

  const handleResolve = async (resolvedValue: string) => {
    if (!current || resolving) return;
    setResolving(true);

    try {
      await fetch('/api/accuracy/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: current.id,
          resolvedValue,
          nodeId: current.placeholder_node_id,
        }),
      });
    } catch {
      // Continue even on network error - local state advances
    }

    setResolving(false);
    setResolvedCount(c => c + 1);
    setShowCheckmark(true);
    setTimeout(() => {
      advanceToNext();
    }, 600);
  };

  const handleSkip = useCallback(async () => {
    if (!current) return;

    try {
      await fetch('/api/accuracy/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: current.id,
          skip: true,
        }),
      });
    } catch {
      // Continue
    }

    setSkippedCount(c => c + 1);
    advanceToNext();
  }, [current, advanceToNext]);

  // 키보드 단축키: 1-4 후보 선택, S 건너뛰기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스 중이면 무시
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (!current || resolving || showCheckmark) return;

      const config = getEntityConfig(current);
      const candidates = current.candidates ?? config.defaults;

      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key) - 1;
        if (idx < candidates.length) {
          handleResolve(candidates[idx]);
        }
      } else if (e.key === 's' || e.key === 'S') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, resolving, showCheckmark, handleSkip]);

  // Empty state
  if (initialEntities.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <CheckCircle size={48} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
          <span style={{ fontWeight: 600, fontSize: 18, color: 'var(--ou-text-strong)' }}>
            모든 기록이 정확해요!
          </span>
          <span style={{ fontSize: 14, textAlign: 'center', color: 'var(--ou-text-dimmed)' }}>
            대화를 더 나눠보세요!<br />
            OU가 잘 모르는 것들이 생기면 여기서 알려드릴게요.
          </span>
          <button
            onClick={() => router.push('/chat')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              borderRadius: 'var(--ou-radius-pill)',
              borderWidth: '0.5px',
              borderStyle: 'solid',
              borderColor: 'var(--ou-border-subtle)',
              background: 'transparent',
              color: 'var(--ou-text-body)',
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <ChatTeardrop size={18} />
            대화하러 가기
          </button>
        </div>
      </div>
    );
  }

  // All done
  if (!current || currentIdx >= entities.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <CheckCircle size={48} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
          <span style={{ fontWeight: 600, fontSize: 18, color: 'var(--ou-text-strong)' }}>
            모두 확인했어요!
          </span>
          <span style={{ textAlign: 'center', fontSize: 14, color: 'var(--ou-text-dimmed)' }}>
            덕분에 OU가 더 정확해졌어요.
          </span>
          <button
            onClick={() => router.push('/my')}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--ou-radius-pill)',
              borderWidth: '0.5px',
              borderStyle: 'solid',
              borderColor: 'var(--ou-border-subtle)',
              background: 'transparent',
              color: 'var(--ou-text-body)',
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            내 우주로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const config = getEntityConfig(current);
  const EntityIcon = config.icon;
  const candidates = current.candidates ?? config.defaults;
  const contextMessages = parseContext(current.context_snippet);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 3,
            color: 'var(--ou-text-dimmed)',
            fontWeight: 500,
          }}
        >
          정확도 높이기
        </span>
        <span style={{ fontSize: 14, color: 'var(--ou-text-body)' }}>
          OU가 아직 모르는 것들이에요. 알려주시면 더 정확해져요.
        </span>
        {/* Progress bar */}
        <div style={{ width: '100%', height: 4, background: 'var(--ou-surface-muted)', borderRadius: 2, marginTop: 8 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--ou-text-dimmed)', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
            {currentIdx + 1} / {entities.length}
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{
              fontSize: 12,
              padding: '2px 8px',
              background: 'var(--ou-surface-muted)',
              border: '0.5px solid var(--ou-border-subtle)',
              borderRadius: 'var(--ou-radius-pill)',
              color: 'var(--ou-text-body)',
            }}>
              전체 {entities.length}
            </span>
            <span style={{
              fontSize: 12,
              padding: '2px 8px',
              background: 'var(--ou-surface-muted)',
              border: '0.5px solid var(--ou-border-subtle)',
              borderRadius: 'var(--ou-radius-pill)',
              color: 'var(--ou-text-body)',
            }}>
              확인 {resolvedCount}
            </span>
            <span style={{
              fontSize: 12,
              padding: '2px 8px',
              background: 'var(--ou-surface-muted)',
              border: '0.5px solid var(--ou-border-subtle)',
              borderRadius: 'var(--ou-radius-pill)',
              color: 'var(--ou-text-body)',
            }}>
              건너뜀 {skippedCount}
            </span>
          </div>
        </div>
      </div>

      {/* 정확도 향상 안내 */}
      {current && (
        <span style={{ fontSize: 14, textAlign: 'center', color: 'var(--ou-text-dimmed)' }}>
          정확도가{' '}
          <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>
            {currentResolvedAccuracy}%
          </span>
          {' → '}
          <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>
            {nextAccuracy}%
          </span>
          {' '}로 높아져요
        </span>
      )}

      {/* 단축키 안내 */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
        <Keyboard size={14} style={{ color: 'var(--ou-text-dimmed)' }} />
        <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
          1~4 선택 · S 건너뛰기 · Enter 직접 입력
        </span>
      </div>

      <div
        style={{
          opacity: slideIn ? 1 : 0,
          transform: slideIn ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'opacity 0.2s, transform 0.2s',
          padding: 20,
          background: 'transparent',
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-card)',
          boxShadow: 'var(--ou-glow-sm)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Context — glass-block with border-left accent */}
          {contextMessages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>이 대화에서</span>
              <div
                style={{
                  padding: 12,
                  background: 'var(--ou-surface-subtle)',
                  borderRadius: 'var(--ou-radius-md)',
                  borderLeft: '2px solid var(--ou-border-muted)',
                }}
              >
                {contextMessages.map((msg, i) => (
                  <p key={i} style={{ fontSize: 14, marginBottom: 4, margin: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--ou-text-dimmed)' }}>
                      {msg.role === 'user' ? '나' : 'OU'}:{' '}
                    </span>
                    <span
                      style={{
                        color: 'var(--ou-text-body)',
                        background: msg.text.includes(current.raw_text)
                          ? 'var(--ou-surface-hover)'
                          : 'transparent',
                        borderRadius: 2,
                        padding: msg.text.includes(current.raw_text) ? '0 2px' : 0,
                      }}
                    >
                      {msg.text}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Question */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <EntityIcon size={20} weight="light" style={{ color: 'var(--ou-text-dimmed)' }} />
            <span style={{ fontWeight: 600, color: 'var(--ou-text-strong)' }}>
              <span
                style={{
                  display: 'inline-block',
                  marginRight: 8,
                  padding: '4px 12px',
                  fontSize: 14,
                  borderRadius: 'var(--ou-radius-pill)',
                  border: '1px solid var(--ou-border-subtle)',
                  color: 'var(--ou-text-strong)',
                }}
              >
                {current.raw_text}
              </span>
              {config.question}
            </span>
          </div>

          {/* 확인 체크마크 — white/bright, no green */}
          {showCheckmark && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--ou-surface-hover)',
                  border: '0.5px solid var(--ou-border-subtle)',
                  boxShadow: 'var(--ou-glow-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'fadeInScale 0.3s ease-out',
                }}
              >
                <Check size={28} weight="bold" style={{ color: 'var(--ou-text-bright)' }} />
              </div>
            </div>
          )}

          {/* Candidate buttons — pill-block style */}
          {!showCheckmark && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {candidates.map((candidate, idx) => (
              <button
                key={candidate}
                disabled={resolving}
                onClick={() => handleResolve(candidate)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 'var(--ou-radius-pill)',
                  borderWidth: '0.5px',
                  borderStyle: 'solid',
                  borderColor: 'var(--ou-border-subtle)',
                  background: 'transparent',
                  color: 'var(--ou-text-body)',
                  boxShadow: 'var(--ou-glow-xs)',
                  transition: 'all var(--ou-transition)',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  cursor: resolving ? 'wait' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--ou-glow-hover)';
                  e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'var(--ou-glow-xs)';
                  e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
                }}
              >
                {idx < 4 && (
                  <span style={{
                    minWidth: 18,
                    fontSize: 10,
                    padding: '1px 4px',
                    borderRadius: 'var(--ou-radius-pill)',
                    border: '1px solid var(--ou-border-subtle)',
                    color: 'var(--ou-text-dimmed)',
                    textAlign: 'center',
                  }}>
                    {idx + 1}
                  </span>
                )}
                <ArrowRight size={14} style={{ color: 'var(--ou-text-dimmed)' }} />
                {candidate}
              </button>
            ))}

            {/* Custom input — input-block style */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                placeholder="직접 입력..."
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customInput.trim()) {
                    handleResolve(customInput.trim());
                  }
                }}
                style={{
                  flex: 1,
                  border: '0.5px solid var(--ou-border-subtle)',
                  borderRadius: 'var(--ou-radius-pill)',
                  background: 'transparent',
                  color: 'var(--ou-text-body)',
                  boxShadow: 'var(--ou-glow-xs)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => customInput.trim() && handleResolve(customInput.trim())}
                disabled={!customInput.trim() || resolving}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--ou-radius-pill)',
                  borderWidth: '0.5px',
                  borderStyle: 'solid',
                  borderColor: 'var(--ou-border-subtle)',
                  background: 'transparent',
                  color: 'var(--ou-text-body)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  cursor: !customInput.trim() || resolving ? 'not-allowed' : 'pointer',
                  opacity: !customInput.trim() ? 0.4 : 1,
                }}
              >
                입력
              </button>
            </div>
          </div>
          )}

          {/* Skip button — subtle text, text-dimmed */}
          {!showCheckmark && (
          <button
            onClick={handleSkip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--ou-text-dimmed)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '4px 0',
            }}
          >
            <SkipForward size={14} />
            건너뛰기 (S)
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
