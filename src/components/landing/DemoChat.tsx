'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DemoCalendar } from './DemoCalendar';

interface ChatMessage {
  type: 'user' | 'assistant';
  text: string;
  inlineView?: 'calendar';
  calendarEvents?: { day: number; label: string }[];
}

interface Props {
  onNodeCreated: (node: { id: string; label: string }) => void;
  onEdgeCreated: (edge: { from: string; to: string }) => void;
}

const SCRIPT: {
  msg: ChatMessage;
  delay: number;
  nodes?: { id: string; label: string }[];
  edges?: { from: string; to: string }[];
}[] = [
  {
    msg: { type: 'user', text: '다음주 일요일 희민이 결혼식' },
    delay: 1200,
    nodes: [{ id: 'hemin', label: '희민' }, { id: 'wedding', label: '결혼식' }],
    edges: [{ from: 'hemin', to: 'wedding' }],
  },
  {
    msg: {
      type: 'assistant',
      text: '희민이 결혼식, 4월 26일 일요일로 기억할게요.',
      inlineView: 'calendar',
      calendarEvents: [{ day: 26, label: '결혼식' }],
    },
    delay: 2000,
  },
  {
    msg: { type: 'user', text: '커피 4,500원' },
    delay: 2500,
    nodes: [{ id: 'expense1', label: '지출' }],
    edges: [{ from: 'me', to: 'expense1' }],
  },
  {
    msg: { type: 'assistant', text: '오늘 커피 지출 4,500원 기록했어요.' },
    delay: 1500,
  },
  {
    msg: { type: 'user', text: '수진이 수요일에 이사한대. 도와줘야지' },
    delay: 2800,
    nodes: [{ id: 'sujin', label: '수진' }, { id: 'moving', label: '이사' }],
    edges: [{ from: 'sujin', to: 'moving' }, { from: 'me', to: 'moving' }],
  },
  {
    msg: {
      type: 'assistant',
      text: '4월 22일 수요일, 수진이 이사 도와주기. 일정에 넣었어요.',
      inlineView: 'calendar',
      calendarEvents: [{ day: 22, label: '이사' }, { day: 26, label: '결혼식' }],
    },
    delay: 2000,
  },
];

export function DemoChat({ onNodeCreated, onEdgeCreated }: Props) {
  const [messages, setMessages] = useState<(ChatMessage & { visible: boolean; typingDone: boolean })[]>([]);
  const [started, setStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Intersection observer
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [started]);

  // Run script
  useEffect(() => {
    if (!started) return;
    let timeout: NodeJS.Timeout;
    let step = 0;

    const run = () => {
      if (step >= SCRIPT.length) {
        // Loop
        timeout = setTimeout(() => {
          setMessages([]);
          step = 0;
          run();
        }, 4000);
        return;
      }

      const item = SCRIPT[step];
      step++;

      // Add message
      setMessages(prev => [...prev, { ...item.msg, visible: false, typingDone: item.msg.type === 'user' }]);

      // Make visible
      setTimeout(() => {
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, visible: true } : m));

        // Typing effect for assistant
        if (item.msg.type === 'assistant') {
          setTimeout(() => {
            setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, typingDone: true } : m));
          }, item.msg.text.length * 25);
        }

        // Spawn nodes/edges
        if (item.nodes) item.nodes.forEach(n => onNodeCreated(n));
        if (item.edges) setTimeout(() => { item.edges!.forEach(e => onEdgeCreated(e)); }, 300);
      }, 50);

      timeout = setTimeout(run, item.delay);
    };

    timeout = setTimeout(run, 600);
    return () => clearTimeout(timeout);
  }, [started, onNodeCreated, onEdgeCreated]);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={sectionRef} style={{
      background: 'var(--ou-surface-faint)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '0.5px solid var(--ou-border-subtle)',
      borderRadius: 'var(--ou-radius-card)',
      padding: 24, display: 'flex', flexDirection: 'column',
      minHeight: 480, boxShadow: 'var(--ou-glow-sm)',
    }}>
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            opacity: msg.visible ? 1 : 0,
            transform: msg.visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}>
            {msg.type === 'user' ? (
              <div style={{
                background: 'var(--ou-surface-subtle)',
                border: '1px solid var(--ou-border-medium)',
                borderRadius: '20px 20px 4px 20px',
                marginLeft: 'auto', maxWidth: '80%',
                padding: '12px 16px', fontSize: 14,
                color: 'var(--ou-text-bright)',
                boxShadow: 'var(--ou-glow-md)',
              }}>{msg.text}</div>
            ) : (
              <div>
                <div style={{
                  maxWidth: '90%', paddingLeft: 14,
                  borderLeft: '1.5px solid var(--ou-border-muted)',
                  fontSize: 14, lineHeight: 1.8,
                  color: 'var(--ou-text-body)',
                }}>
                  {msg.typingDone ? msg.text : (
                    <span>
                      {msg.text.substring(0, Math.floor(msg.text.length * 0.3))}
                      <span style={{
                        display: 'inline-block', width: 2, height: 14,
                        background: 'var(--ou-text-body)', marginLeft: 2,
                        animation: 'blink 0.8s step-end infinite',
                        verticalAlign: 'text-bottom',
                      }} />
                    </span>
                  )}
                </div>
                {msg.typingDone && msg.inlineView === 'calendar' && msg.calendarEvents && (
                  <div style={{ marginTop: 12, animation: 'ou-fade-in 0.4s ease' }}>
                    <DemoCalendar events={msg.calendarEvents} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{
          border: '0.5px solid var(--ou-border-subtle)',
          borderRadius: 'var(--ou-radius-pill)',
          padding: '14px 24px', fontSize: 14,
          color: 'var(--ou-text-muted)',
        }}>무엇이든 말해보세요</div>
      </div>
    </div>
  );
}
