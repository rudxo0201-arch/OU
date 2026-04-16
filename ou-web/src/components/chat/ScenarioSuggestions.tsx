'use client';

import { Box, Group, Stack, Text, UnstyledButton, ScrollArea } from '@mantine/core';
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
    <Stack gap="sm" px="md" py="sm">
      <Text fz="xs" c="dimmed">이렇게 시작해보세요</Text>
      <ScrollArea scrollbarSize={4} type="hover">
        <Group gap="sm" wrap="nowrap">
          {scenarios.map(scenario => {
            const IconComponent = SCENARIO_ICONS[scenario.icon] ?? Star;
            return (
              <UnstyledButton
                key={scenario.id}
                onClick={() => onSelect(scenario)}
                style={{
                  minWidth: 180,
                  maxWidth: 220,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '0.5px solid var(--mantine-color-default-border)',
                  transition: 'all 150ms',
                  flexShrink: 0,
                }}
                styles={{
                  root: {
                    '&:hover': {
                      borderColor: 'var(--mantine-color-dark-4)',
                      backgroundColor: 'var(--mantine-color-gray-0)',
                    },
                  },
                }}
              >
                <Group gap="xs" mb={6} wrap="nowrap">
                  <IconComponent size={16} weight="bold" style={{ opacity: 0.6, flexShrink: 0 }} />
                  <Text fz="xs" fw={600} lineClamp={1}>{scenario.title}</Text>
                </Group>
                <Text fz={10} c="dimmed" lineClamp={2} style={{ lineHeight: 1.5 }}>
                  {scenario.description}
                </Text>
              </UnstyledButton>
            );
          })}
        </Group>
      </ScrollArea>
    </Stack>
  );
}
