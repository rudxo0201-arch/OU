'use client';

import { CSSProperties, useEffect, useState } from 'react';
import { useCareSubjectsStore } from '@/stores/careSubjectsStore';
import { BabyQuickBar } from './babylog/BabyQuickBar';
import { FeedingWidget } from './babylog/widgets/FeedingWidget';
import { DiaperWidget } from './babylog/widgets/DiaperWidget';
import { SleepWidget } from './babylog/widgets/SleepWidget';
import { MedicationWidget } from './babylog/widgets/MedicationWidget';
import { TemperatureWidget } from './babylog/widgets/TemperatureWidget';
import { FoodReactionWidget } from './babylog/widgets/FoodReactionWidget';

// ── 온보딩: 처음 방문 시 아이 등록 ──────────────────────────────────────
function OnboardingScreen() {
  const { addSubject, setActiveSubjectName } = useCareSubjectsStore();
  const [names, setNames] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);

  function updateName(i: number, val: string) {
    setNames(prev => prev.map((n, idx) => idx === i ? val : n));
  }

  async function handleStart() {
    const toRegister = names.map(n => n.trim()).filter(Boolean);
    if (!toRegister.length || submitting) return;
    setSubmitting(true);
    try {
      for (const name of toRegister) {
        const res = await fetch('/api/care/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject_type: 'child', name }),
        });
        const json = await res.json();
        if (json.subject) addSubject(json.subject);
      }
      setActiveSubjectName(toRegister[0]);
    } finally {
      setSubmitting(false);
    }
  }

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '40px 24px',
    textAlign: 'center',
  };

  const cardStyle: CSSProperties = {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 20,
    padding: '36px 32px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid rgba(0,0,0,0.12)',
    borderRadius: 10,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 10,
  };

  const hasAny = names.some(n => n.trim());

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>◐</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ou-text-heading)', marginBottom: 6 }}>
          아이를 먼저 등록해주세요
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ou-text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
          이름이나 호칭을 입력하면<br />기록이 자동으로 구분돼요
        </p>

        <input
          autoFocus
          value={names[0]}
          onChange={e => updateName(0, e.target.value)}
          onKeyDown={e => e.key === 'Enter' && hasAny && handleStart()}
          placeholder="첫째 이름 (예: 서하, 첫째)"
          style={inputStyle}
        />
        <input
          value={names[1]}
          onChange={e => updateName(1, e.target.value)}
          onKeyDown={e => e.key === 'Enter' && hasAny && handleStart()}
          placeholder="둘째 이름 (선택)"
          style={inputStyle}
        />

        <button
          onClick={handleStart}
          disabled={!hasAny || submitting}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            background: hasAny ? 'rgba(0,0,0,0.88)' : 'rgba(0,0,0,0.10)',
            color: hasAny ? '#fff' : 'rgba(0,0,0,0.3)',
            border: 'none',
            fontSize: 15,
            fontWeight: 600,
            cursor: hasAny ? 'pointer' : 'default',
            transition: 'all 140ms ease',
            marginTop: 4,
          }}
        >
          {submitting ? '등록 중...' : '시작하기'}
        </button>
      </div>
    </div>
  );
}

// ── 메인 뷰 ──────────────────────────────────────────────────────────────
export function BabyLogView() {
  const { subjects, activeSubjectName, setActiveSubjectName, addSubject, loaded, setSubjects, setLoaded } = useCareSubjectsStore();
  const [showAddInput, setShowAddInput] = useState(false);
  const [newName, setNewName] = useState('');

  // 이 컴포넌트에서 subjects 로딩
  useEffect(() => {
    if (loaded) return;
    fetch('/api/care/subjects')
      .then(r => r.json())
      .then(json => { if (json.subjects) setSubjects(json.subjects); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [loaded, setSubjects, setLoaded]);

  // 로딩 중
  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--ou-text-muted)' }}>
      <span className="ou-spinner" style={{ width: 20, height: 20 }} />
    </div>
  );

  // 온보딩: 아이가 없으면 등록 화면
  if (subjects.length === 0) return <OnboardingScreen />;

  async function handleAddSubject() {
    if (!newName.trim()) return;
    const res = await fetch('/api/care/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject_type: 'child', name: newName.trim() }),
    });
    const json = await res.json();
    if (json.subject) {
      addSubject(json.subject);
      setActiveSubjectName(json.subject.name);
    }
    setNewName('');
    setShowAddInput(false);
  }

  return (
    <div style={{ padding: '20px 24px 120px', maxWidth: 1200, margin: '0 auto' }}>
      {/* 아이 선택 탭 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[null, ...subjects.map(s => s.name)].map(name => (
          <button
            key={name ?? '전체'}
            onClick={() => setActiveSubjectName(name)}
            style={{
              padding: '4px 14px', borderRadius: 9999,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: '1px solid',
              borderColor: activeSubjectName === name ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.12)',
              background: activeSubjectName === name ? 'rgba(0,0,0,0.88)' : 'transparent',
              color: activeSubjectName === name ? '#fff' : 'var(--ou-text-secondary)',
              transition: 'all 120ms ease',
            }}
          >
            {name ?? '전체'}
          </button>
        ))}

        {/* 아이 추가 */}
        {showAddInput ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddSubject(); if (e.key === 'Escape') setShowAddInput(false); }}
              placeholder="이름 입력"
              style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.14)', fontSize: 13, outline: 'none', width: 100 }}
            />
            <button onClick={handleAddSubject} style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.88)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>추가</button>
            <button onClick={() => setShowAddInput(false)} style={{ padding: '4px 8px', borderRadius: 8, background: 'transparent', color: 'var(--ou-text-muted)', border: '1px solid rgba(0,0,0,0.10)', fontSize: 12, cursor: 'pointer' }}>취소</button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 12, border: '1px dashed rgba(0,0,0,0.18)', background: 'transparent', color: 'var(--ou-text-muted)', cursor: 'pointer' }}
          >
            + 아이 추가
          </button>
        )}
      </div>

      {/* Quick 입력창 */}
      <BabyQuickBar />

      {/* 위젯 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        <FeedingWidget />
        <SleepWidget />
        <DiaperWidget />
        <TemperatureWidget />
        <MedicationWidget />
        <FoodReactionWidget />
      </div>
    </div>
  );
}
