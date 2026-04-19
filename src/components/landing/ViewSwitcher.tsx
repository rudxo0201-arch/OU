'use client';

import { useState } from 'react';
import { DemoCalendar } from './DemoCalendar';

const EVENTS = [
  { day: 13, label: '엄마 생신' },
  { day: 22, label: '수진 이사' },
  { day: 26, label: '희민 결혼식' },
  { day: 28, label: '프로젝트 마감' },
];

const TABLE_DATA = [
  { date: '4월 13일', content: '엄마 생신 저녁', category: '일정' },
  { date: '4월 22일', content: '수진이 이사 도와주기', category: '일정' },
  { date: '4월 26일', content: '희민이 결혼식', category: '일정' },
  { date: '4월 28일', content: '프로젝트 마감', category: '할 일' },
  { date: '매일', content: '커피 4,500원', category: '지출' },
];

const GRAPH_NODES = [
  { id: 'me', label: '나', x: 50, y: 45, size: 8 },
  { id: 'hemin', label: '희민', x: 22, y: 22, size: 5 },
  { id: 'sujin', label: '수진', x: 75, y: 28, size: 5 },
  { id: 'wedding', label: '결혼식', x: 28, y: 68, size: 5 },
  { id: 'project', label: '프로젝트', x: 70, y: 62, size: 5 },
  { id: 'mom', label: '엄마', x: 50, y: 82, size: 4 },
];

const GRAPH_EDGES = [
  { from: 'me', to: 'hemin' }, { from: 'me', to: 'sujin' },
  { from: 'me', to: 'wedding' }, { from: 'me', to: 'project' },
  { from: 'me', to: 'mom' }, { from: 'hemin', to: 'wedding' },
  { from: 'sujin', to: 'wedding' },
];

type ViewType = 'calendar' | 'table' | 'graph';

export function ViewSwitcher() {
  const [view, setView] = useState<ViewType>('calendar');

  return (
    <div style={{ width: '100%', maxWidth: 800 }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
        {(['calendar', 'table', 'graph'] as ViewType[]).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '8px 24px', borderRadius: 'var(--ou-radius-pill)',
            border: `0.5px solid ${view === v ? 'var(--ou-border-strong)' : 'var(--ou-border-subtle)'}`,
            color: view === v ? 'var(--ou-text-bright)' : 'var(--ou-text-secondary)',
            fontSize: 13, transition: 'var(--ou-transition)',
            boxShadow: view === v ? 'var(--ou-glow-md)' : 'var(--ou-glow-xs)',
          }}>
            {{ calendar: '캘린더', table: '표', graph: '그래프' }[v]}
          </button>
        ))}
      </div>

      <div style={{
        border: '0.5px solid var(--ou-border-subtle)',
        borderRadius: 'var(--ou-radius-card)',
        padding: 32, minHeight: 380,
        boxShadow: 'var(--ou-glow-sm)',
        animation: 'ou-fade-in 0.3s ease',
      }} key={view}>
        {view === 'calendar' && <DemoCalendar events={EVENTS} />}

        {view === 'table' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['날짜', '내용', '분류'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', fontSize: 11, color: 'var(--ou-text-dimmed)',
                    fontWeight: 500, padding: '8px 12px',
                    borderBottom: '0.5px solid var(--ou-border-faint)',
                    letterSpacing: 1, textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_DATA.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 13, color: 'var(--ou-text-body)', padding: '12px', borderBottom: '0.5px solid var(--ou-border-faint)' }}>{row.date}</td>
                  <td style={{ fontSize: 13, color: 'var(--ou-text-body)', padding: '12px', borderBottom: '0.5px solid var(--ou-border-faint)' }}>{row.content}</td>
                  <td style={{ fontSize: 13, color: 'var(--ou-text-dimmed)', padding: '12px', borderBottom: '0.5px solid var(--ou-border-faint)' }}>{row.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === 'graph' && (
          <div style={{ position: 'relative', height: 320 }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              {GRAPH_EDGES.map((e, i) => {
                const from = GRAPH_NODES.find(n => n.id === e.from)!;
                const to = GRAPH_NODES.find(n => n.id === e.to)!;
                return <line key={i} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} stroke="var(--ou-border-faint)" strokeWidth="0.5" />;
              })}
            </svg>
            {GRAPH_NODES.map(n => (
              <div key={n.id} style={{
                position: 'absolute', left: `${n.x}%`, top: `${n.y}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: n.size * 2, height: n.size * 2, borderRadius: '50%',
                  background: `rgba(0,0,0,${n.size > 6 ? 0.76 : 0.48})`,
                  boxShadow: 'var(--ou-neu-raised-sm)',
                }} />
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', whiteSpace: 'nowrap' }}>{n.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
