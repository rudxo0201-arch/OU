'use client';

import { CSSProperties } from 'react';
import { useCareSubjectsStore } from '@/stores/careSubjectsStore';
import { BabyQuickBar } from './babylog/BabyQuickBar';
import { FeedingWidget } from './babylog/widgets/FeedingWidget';
import { DiaperWidget } from './babylog/widgets/DiaperWidget';
import { SleepWidget } from './babylog/widgets/SleepWidget';
import { MedicationWidget } from './babylog/widgets/MedicationWidget';
import { TemperatureWidget } from './babylog/widgets/TemperatureWidget';
import { FoodReactionWidget } from './babylog/widgets/FoodReactionWidget';

const containerStyle: CSSProperties = {
  padding: '20px 24px 120px',
  maxWidth: 1200,
  margin: '0 auto',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 20,
};

const subjectTabStyle = (active: boolean): CSSProperties => ({
  padding: '4px 14px',
  borderRadius: 9999,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid',
  borderColor: active ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.12)',
  background: active ? 'rgba(0,0,0,0.88)' : 'transparent',
  color: active ? '#fff' : 'var(--ou-text-secondary)',
  transition: 'all 120ms ease',
  userSelect: 'none',
});

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: 16,
};

export function BabyLogView() {
  const { subjects, activeSubjectName, setActiveSubjectName } = useCareSubjectsStore();

  const allLabel = '전체';
  const tabs = [allLabel, ...subjects.map(s => s.name)];

  return (
    <div style={containerStyle}>
      {/* 아이 선택 탭 */}
      <div style={headerStyle}>
        {tabs.map(name => (
          <button
            key={name}
            style={subjectTabStyle(
              name === allLabel
                ? activeSubjectName === null
                : activeSubjectName === name
            )}
            onClick={() => setActiveSubjectName(name === allLabel ? null : name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Quick 입력창 */}
      <BabyQuickBar />

      {/* 위젯 그리드 */}
      <div style={gridStyle}>
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
