'use client';

import {
  CalendarBlank, CurrencyKrw, CheckSquare, SmileyMeh, ListChecks,
  Barbell, Brain, Users, Notebook, Lightbulb, BookOpen, FunnelSimple,
  Gift, Star,
} from '@phosphor-icons/react';
import type { ComponentType } from 'react';

const SCENARIO_ICONS: Record<string, ComponentType<any>> = {
  CalendarBlank, CurrencyKrw, CheckSquare, SmileyMeh, ListChecks,
  Barbell, Brain, Users, Notebook, Lightbulb, BookOpen, FunnelSimple, Gift, Star,
};
import type { Scenario } from '@/data/scenarios';

interface ScenarioSuggestionsProps {
  scenarios: Scenario[];
  onSelect: (scenario: Scenario) => void;
}

export function ScenarioSuggestions({ scenarios, onSelect }: ScenarioSuggestionsProps) {
  if (scenarios.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 16px' }}>
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)' }}>이렇게 시작해보세요</span>
      <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 8, flexWrap: 'nowrap' }}>
          {scenarios.map(scenario => {
            const IconComponent = SCENARIO_ICONS[scenario.icon] ?? Star;
            return (
              <button
                key={scenario.id}
                onClick={() => onSelect(scenario)}
                style={{
                  minWidth: 180,
                  maxWidth: 220,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '0.5px solid var(--ou-border-subtle)',
                  transition: 'all 150ms',
                  flexShrink: 0,
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--ou-border-hover)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--ou-border-subtle)';
                  e.currentTarget.style.background = 'none';
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 6, flexWrap: 'nowrap' }}>
                  <IconComponent size={16} weight="bold" style={{ opacity: 0.6, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ou-text-body)' }}>{scenario.title}</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {scenario.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
