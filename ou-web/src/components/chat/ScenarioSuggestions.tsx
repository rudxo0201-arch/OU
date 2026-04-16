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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 10, color: 'var(--ou-text-dimmed)', letterSpacing: '0.5px' }}>
        이렇게 시작해보세요
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {scenarios.map(scenario => {
          const IconComponent = SCENARIO_ICONS[scenario.icon] ?? Star;
          return (
            <button
              key={scenario.id}
              onClick={() => onSelect(scenario)}
              className="pill-block"
            >
              <IconComponent size={12} weight="bold" />
              {scenario.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
