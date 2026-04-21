'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore, type ChatMessage } from '@/stores/chatStore';
import { useTutorialStore } from '@/stores/tutorialStore';
import { TUTORIAL_STEPS, TUTORIAL_STEP_COUNT } from '@/data/tutorial';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { stripLLMMeta } from '@/lib/utils/stripLLMMeta';
import { BaseAppLayout } from '@/components/apps/BaseAppLayout';
import { Plus } from '@phosphor-icons/react';

// 30분 이상 gap이 있으면 새 세션으로 분리
const SESSION_GAP_MS = 30 * 60 * 1000;

interface Session {
  id: string;
  label: string;
  startTime: Date;
  messageIndex: number;
}

function groupIntoSessions(messages: ChatMessage[]): Session[] {
  const sessions: Session[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const isNewSession =
      i === 0 ||
      (prev && msg.createdAt && prev.createdAt &&
        msg.createdAt.getTime() - prev.createdAt.getTime() > SESSION_GAP_MS);

    if (isNewSession) {
      // 세션의 마지막 assistant 메시지의 title → 없으면 첫 user 메시지 30자
      // (title은 LLM meta에서 파싱, 추후 sessions 갱신 시 update)
      const firstUser = messages.slice(i).find(m => m.role === 'user');
      const lastAssistant = [...messages].slice(i).filter(m => m.role === 'assistant' && !m.streaming).pop();
      const label =
        lastAssistant?.title ??
        (firstUser
          ? firstUser.content.trim().slice(0, 30) + (firstUser.content.length > 30 ? '…' : '')
          : '대화');
      sessions.push({
        id: `session-${i}`,
        label,
        startTime: msg.createdAt ?? new Date(),
        messageIndex: i,
      });
    }
  }

  return sessions;
}

function formatSessionTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return '이번 주';
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function DeepTalkPage() {
  const { messages, persistGuest, restoreGuest } = useChatStore();
  const tutorialPhase = useTutorialStore(s => s.phase);
  const tutorialStepIndex = useTutorialStore(s => s.stepIndex);
  const skipStep = useTutorialStore(s => s.skipStep);
  const router = useRouter();

  const [activeSessionIdx, setActiveSessionIdx] = useState<number | null>(null);

  // 마운트 시 DB에서 대화 복원
  useEffect(() => {
    fetch('/api/chat/history')
      .then(r => r.json())
      .then(({ messages: dbMsgs }: { messages: Array<{ id: string; role: string; raw: string; created_at: string }> }) => {
        if (dbMsgs && dbMsgs.length > 0 && useChatStore.getState().messages.length === 0) {
          dbMsgs.forEach(m => useChatStore.getState().addMessage({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.role === 'assistant' ? stripLLMMeta(m.raw) : m.raw,
            createdAt: new Date(m.created_at),
          }));
        } else {
          restoreGuest();
        }
      })
      .catch(() => restoreGuest());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 메시지 변경 시 자동 저장
  useEffect(() => {
    const hasNonStreaming = messages.some(m => !m.streaming);
    if (hasNonStreaming) persistGuest();
  }, [messages, persistGuest]);

  // 튜토리얼: 이탈 시 fallback
  useEffect(() => {
    if (tutorialPhase !== 'active') return;
    const snapshot = useChatStore.getState().messages.filter(
      m => m.role === 'assistant' && m.nodeCreated && !m.streaming
    ).length;
    return () => {
      const phase = useTutorialStore.getState().phase;
      if (phase !== 'active') return;
      const current = useChatStore.getState().messages.filter(
        m => m.role === 'assistant' && m.nodeCreated && !m.streaming
      ).length;
      if (current > snapshot) useTutorialStore.getState().completeStep();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialPhase]);

  const sessions = useMemo(() => groupIntoSessions(messages), [messages]);

  const currentGuideMessage = tutorialPhase === 'active'
    ? TUTORIAL_STEPS[tutorialStepIndex]?.guideMessage
    : undefined;

  // 세션 사이드바
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)', fontFamily: 'var(--ou-font-mono)', letterSpacing: '0.05em' }}>
          대화 기록
        </span>
        <button
          onClick={() => {
            setActiveSessionIdx(null);
            useChatStore.getState().clearRequestedViews();
          }}
          title="새 대화"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            border: 'none', background: 'var(--ou-bg)',
            boxShadow: 'var(--ou-neu-raised-xs)',
            color: 'var(--ou-text-muted)', fontSize: 11,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Plus size={10} />
          새 대화
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sessions.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ou-text-disabled)', padding: '24px 0', textAlign: 'center' }}>
            대화가 없어요
          </div>
        ) : (
          [...sessions].reverse().map((session, i) => {
            const isActive = activeSessionIdx === sessions.length - 1 - i;
            return (
              <button
                key={session.id}
                onClick={() => setActiveSessionIdx(sessions.length - 1 - i)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 10px', borderRadius: 8,
                  border: 'none',
                  background: isActive ? 'var(--ou-bg)' : 'transparent',
                  boxShadow: isActive ? 'var(--ou-neu-raised-xs)' : 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                  transition: 'all 150ms ease',
                }}
              >
                <div style={{
                  fontSize: 12, color: isActive ? 'var(--ou-text-strong)' : 'var(--ou-text-body)',
                  lineHeight: 1.4, marginBottom: 2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {session.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ou-text-disabled)', fontFamily: 'var(--ou-font-mono)' }}>
                  {formatSessionTime(session.startTime)}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <BaseAppLayout appLabel="Deep Talk" sidebar={sidebar}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* 튜토리얼 가이드 */}
        {currentGuideMessage && (
          <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              {Array.from({ length: TUTORIAL_STEP_COUNT }).map((_, i) => (
                <div key={i} style={{
                  width: i === tutorialStepIndex ? 16 : 6,
                  height: 6, borderRadius: 99,
                  background: i === tutorialStepIndex
                    ? 'var(--ou-text-secondary)'
                    : i < tutorialStepIndex
                      ? 'var(--ou-text-muted)'
                      : 'var(--ou-border-faint)',
                  transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }} />
              ))}
              <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)', marginLeft: 4 }}>
                {tutorialStepIndex + 1} / {TUTORIAL_STEP_COUNT}
              </span>
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-sm)',
              fontSize: 13, lineHeight: 1.6, color: 'var(--ou-text-body)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              marginBottom: 8,
            }}>
              <span>{currentGuideMessage}</span>
              <button
                onClick={() => { skipStep(); router.push('/home'); }}
                style={{
                  fontSize: 11, color: 'var(--ou-text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                건너뛰기
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatPanel autoSendOnOpen />
        </div>
      </div>
    </BaseAppLayout>
  );
}
