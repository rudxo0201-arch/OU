'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViewProps } from './registry';

type Tab = 'clock' | 'stopwatch' | 'timer' | 'alarm';

// ── 유틸 ─────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0'); }

function msToDisplay(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return { h, m, s, cs };
}

// ── 공통 스타일 ───────────────────────────────────────────
const glass = {
  background: 'var(--ou-glass)',
  backdropFilter: 'var(--ou-blur-light)',
  WebkitBackdropFilter: 'var(--ou-blur-light)',
  border: '1px solid var(--ou-glass-border)',
  borderRadius: 'var(--ou-radius-card)',
} as const;

const btn = (active = false, accent = false) => ({
  padding: '10px 24px',
  borderRadius: 'var(--ou-radius-pill)',
  border: `1px solid ${accent ? 'var(--ou-accent)' : 'var(--ou-glass-border)'}`,
  background: accent ? 'var(--ou-accent)' : active ? 'var(--ou-glass-active)' : 'var(--ou-glass)',
  color: accent ? '#fff' : 'var(--ou-text-body)',
  fontSize: 'var(--ou-text-sm)',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all var(--ou-transition-fast)',
  flexShrink: 0,
} as const);

// ── 시계 탭 ─────────────────────────────────────────────
function ClockTab() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const deg = { h: h * 30 + m * 0.5, m: m * 6 + s * 0.1, s: s * 6 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
      {/* 아날로그 시계 */}
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        <svg width={220} height={220} viewBox="0 0 220 220">
          {/* 외곽 */}
          <circle cx={110} cy={110} r={104} fill="var(--ou-glass)" stroke="var(--ou-glass-border)" strokeWidth={1} />
          {/* 눈금 */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = i * 6 * Math.PI / 180;
            const isMaj = i % 5 === 0;
            const r1 = isMaj ? 88 : 92, r2 = 100;
            return (
              <line key={i}
                x1={110 + r1 * Math.sin(angle)} y1={110 - r1 * Math.cos(angle)}
                x2={110 + r2 * Math.sin(angle)} y2={110 - r2 * Math.cos(angle)}
                stroke={isMaj ? 'var(--ou-text-secondary)' : 'var(--ou-text-disabled)'}
                strokeWidth={isMaj ? 2 : 1}
              />
            );
          })}
          {/* 시침 */}
          <line x1={110} y1={110}
            x2={110 + 55 * Math.sin(deg.h * Math.PI / 180)}
            y2={110 - 55 * Math.cos(deg.h * Math.PI / 180)}
            stroke="var(--ou-text-heading)" strokeWidth={4} strokeLinecap="round"
          />
          {/* 분침 */}
          <line x1={110} y1={110}
            x2={110 + 75 * Math.sin(deg.m * Math.PI / 180)}
            y2={110 - 75 * Math.cos(deg.m * Math.PI / 180)}
            stroke="var(--ou-text-strong)" strokeWidth={2.5} strokeLinecap="round"
          />
          {/* 초침 */}
          <line x1={110} y1={110}
            x2={110 + 80 * Math.sin(deg.s * Math.PI / 180)}
            y2={110 - 80 * Math.cos(deg.s * Math.PI / 180)}
            stroke="var(--ou-accent)" strokeWidth={1.5} strokeLinecap="round"
          />
          <circle cx={110} cy={110} r={4} fill="var(--ou-accent)" />
        </svg>
      </div>

      {/* 디지털 */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ou-text-heading)', fontVariantNumeric: 'tabular-nums' }}>
          {pad(h)}:{pad(m)}:{pad(s)}
        </div>
        <div style={{ fontSize: 'var(--ou-text-sm)', color: 'var(--ou-text-muted)', marginTop: 4 }}>
          {now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </div>
      </div>

      {/* 세계 시각 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { city: 'New York', offset: -4 },
          { city: 'London', offset: 1 },
          { city: 'Tokyo', offset: 9 },
        ].map(({ city, offset }) => {
          const t = new Date(now.getTime() + (offset - (now.getTimezoneOffset() / -60)) * 3600000);
          return (
            <div key={city} style={{ ...glass, padding: '10px 20px', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 'var(--ou-text-xs)', color: 'var(--ou-text-muted)', marginBottom: 4 }}>{city}</div>
              <div style={{ fontSize: 'var(--ou-text-lg)', fontWeight: 600, color: 'var(--ou-text-strong)', fontVariantNumeric: 'tabular-nums' }}>
                {pad(t.getHours())}:{pad(t.getMinutes())}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 스톱워치 탭 ──────────────────────────────────────────
function StopwatchTab() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const startRef = useRef<number>(0);
  const baseRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    setElapsed(baseRef.current + (Date.now() - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const toggle = () => {
    if (running) {
      cancelAnimationFrame(rafRef.current);
      baseRef.current += Date.now() - startRef.current;
    } else {
      startRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    baseRef.current = 0;
  };

  const lap = () => setLaps((l) => [...l, elapsed]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const { h, m, s, cs } = msToDisplay(elapsed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--ou-text-heading)', fontVariantNumeric: 'tabular-nums' }}>
          {h > 0 && <>{pad(h)}:</>}{pad(m)}:{pad(s)}
        </div>
        <div style={{ fontSize: 36, color: 'var(--ou-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>.{pad(cs)}</div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button style={btn(false)} onClick={running ? lap : reset}>{running ? '랩' : '초기화'}</button>
        <button style={btn(false, true)} onClick={toggle}>{running ? '정지' : '시작'}</button>
      </div>

      {laps.length > 0 && (
        <div style={{ width: '100%', maxWidth: 320, maxHeight: 200, overflowY: 'auto' }}>
          {[...laps].reverse().map((t, i) => {
            const { h, m, s, cs } = msToDisplay(t);
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ou-glass-border)', color: 'var(--ou-text-secondary)', fontSize: 'var(--ou-text-sm)' }}>
                <span>랩 {laps.length - i}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}.{pad(cs)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 타이머 탭 ────────────────────────────────────────────
function TimerTab() {
  const [totalMs, setTotalMs] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [setting, setSetting] = useState({ h: 0, m: 0, s: 0 });
  const endRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const left = endRef.current - Date.now();
    if (left <= 0) {
      setRemaining(0);
      setRunning(false);
      setDone(true);
      return;
    }
    setRemaining(left);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = () => {
    const ms = (setting.h * 3600 + setting.m * 60 + setting.s) * 1000;
    if (ms === 0) return;
    setTotalMs(ms);
    setRemaining(ms);
    setDone(false);
    endRef.current = Date.now() + ms;
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
  };

  const resume = () => {
    endRef.current = Date.now() + remaining;
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setRemaining(0);
    setTotalMs(0);
    setDone(false);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const { h, m, s } = msToDisplay(remaining);
  const progress = totalMs > 0 ? (1 - remaining / totalMs) : 0;
  const r = 90, circ = 2 * Math.PI * r;

  const presets = [
    { label: '1분', m: 1, s: 0 },
    { label: '5분', m: 5, s: 0 },
    { label: '10분', m: 10, s: 0 },
    { label: '25분', m: 25, s: 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
      {/* 원형 프로그레스 */}
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        <svg width={220} height={220} viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={110} cy={110} r={r} fill="none" stroke="var(--ou-glass-border)" strokeWidth={6} />
          <circle cx={110} cy={110} r={r} fill="none"
            stroke={done ? 'var(--ou-success)' : 'var(--ou-accent)'}
            strokeWidth={6} strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {done ? (
            <div style={{ fontSize: 32, color: 'var(--ou-success)' }}>✓</div>
          ) : (
            <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ou-text-heading)', fontVariantNumeric: 'tabular-nums' }}>
              {pad(h)}:{pad(m)}:{pad(s)}
            </div>
          )}
        </div>
      </div>

      {/* 시간 설정 (미실행 시) */}
      {!running && totalMs === 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(['h', 'm', 's'] as const).map((unit, i) => (
              <div key={unit} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number" min={0} max={unit === 'h' ? 23 : 59}
                  value={setting[unit]}
                  onChange={(e) => setSetting((p) => ({ ...p, [unit]: Math.max(0, Math.min(unit === 'h' ? 23 : 59, +e.target.value)) }))}
                  style={{ width: 56, textAlign: 'center', background: 'var(--ou-glass)', border: '1px solid var(--ou-glass-border)', borderRadius: 'var(--ou-radius-sm)', color: 'var(--ou-text-heading)', fontSize: 24, fontWeight: 600, padding: '6px 0', outline: 'none' }}
                />
                <span style={{ color: 'var(--ou-text-muted)', fontSize: 'var(--ou-text-xs)' }}>{['시', '분', '초'][i]}</span>
                {i < 2 && <span style={{ color: 'var(--ou-text-disabled)' }}>:</span>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {presets.map((p) => (
              <button key={p.label} style={btn()} onClick={() => setSetting({ h: 0, m: p.m, s: p.s })}>
                {p.label}
              </button>
            ))}
          </div>
          <button style={btn(false, true)} onClick={start}>시작</button>
        </>
      )}

      {(running || (totalMs > 0 && !done)) && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={btn()} onClick={reset}>초기화</button>
          <button style={btn(false, true)} onClick={running ? pause : resume}>{running ? '일시정지' : '계속'}</button>
        </div>
      )}

      {done && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ color: 'var(--ou-success)', fontSize: 'var(--ou-text-base)', fontWeight: 600 }}>타이머 완료!</div>
          <button style={btn()} onClick={reset}>다시 설정</button>
        </div>
      )}
    </div>
  );
}

// ── 알람 탭 ──────────────────────────────────────────────
function AlarmTab() {
  const [alarms, setAlarms] = useState<{ id: string; time: string; label: string; on: boolean }[]>([]);
  const [newTime, setNewTime] = useState('07:00');
  const [newLabel, setNewLabel] = useState('');

  const add = () => {
    if (!newTime) return;
    setAlarms((a) => [...a, { id: crypto.randomUUID(), time: newTime, label: newLabel || '알람', on: true }]);
    setNewLabel('');
  };

  const toggle = (id: string) => setAlarms((a) => a.map((al) => al.id === id ? { ...al, on: !al.on } : al));
  const remove = (id: string) => setAlarms((a) => a.filter((al) => al.id !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 360 }}>
      {/* 알람 추가 */}
      <div style={{ ...glass, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
          style={{ background: 'none', border: 'none', outline: 'none', fontSize: 40, fontWeight: 700, color: 'var(--ou-text-heading)', width: '100%', fontVariantNumeric: 'tabular-nums' }}
        />
        <input placeholder="알람 이름 (선택)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
          style={{ background: 'var(--ou-glass)', border: '1px solid var(--ou-glass-border)', borderRadius: 'var(--ou-radius-sm)', padding: '8px 12px', color: 'var(--ou-text-body)', fontSize: 'var(--ou-text-sm)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
        />
        <button style={{ ...btn(false, true), textAlign: 'center' }} onClick={add}>+ 알람 추가</button>
      </div>

      {/* 알람 목록 */}
      {alarms.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--ou-text-disabled)', fontSize: 'var(--ou-text-sm)', padding: '20px 0' }}>
          알람이 없습니다
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alarms.map((al) => (
            <div key={al.id} style={{ ...glass, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, opacity: al.on ? 1 : 0.4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ou-text-heading)', fontVariantNumeric: 'tabular-nums' }}>{al.time}</div>
                <div style={{ fontSize: 'var(--ou-text-xs)', color: 'var(--ou-text-muted)' }}>{al.label}</div>
              </div>
              {/* 토글 */}
              <div onClick={() => toggle(al.id)} style={{
                width: 44, height: 24, borderRadius: 12,
                background: al.on ? 'var(--ou-accent)' : 'var(--ou-glass-border)',
                position: 'relative', cursor: 'pointer', transition: 'background var(--ou-transition-fast)', flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: al.on ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left var(--ou-transition-fast)',
                }} />
              </div>
              <button onClick={() => remove(al.id)} style={{ background: 'none', border: 'none', color: 'var(--ou-text-muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 TimeView ─────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: 'clock',     label: '시계' },
  { key: 'stopwatch', label: '스톱워치' },
  { key: 'timer',     label: '타이머' },
  { key: 'alarm',     label: '알람' },
];

export function TimeView({ inline }: ViewProps) {
  const [tab, setTab] = useState<Tab>('clock');

  if (inline) {
    // 인라인(위젯): 디지털 시계만 표시
    const [now, setNow] = useState(new Date());
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);
    return (
      <div style={{ padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--ou-text-heading)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
        </div>
        <div style={{ fontSize: 'var(--ou-text-xs)', color: 'var(--ou-text-muted)', marginTop: 4 }}>
          {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, minHeight: 'calc(100vh - 52px)' }}>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, ...glass, padding: '4px' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 20px',
            borderRadius: 'var(--ou-radius-sm)',
            border: 'none',
            background: tab === t.key ? 'var(--ou-glass-strong)' : 'transparent',
            color: tab === t.key ? 'var(--ou-text-heading)' : 'var(--ou-text-secondary)',
            fontSize: 'var(--ou-text-sm)',
            fontWeight: tab === t.key ? 600 : 400,
            cursor: 'pointer',
            transition: 'all var(--ou-transition-fast)',
            boxShadow: tab === t.key ? 'var(--ou-accent-glow)' : 'none',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {tab === 'clock'     && <ClockTab />}
        {tab === 'stopwatch' && <StopwatchTab />}
        {tab === 'timer'     && <TimerTab />}
        {tab === 'alarm'     && <AlarmTab />}
      </div>
    </div>
  );
}
