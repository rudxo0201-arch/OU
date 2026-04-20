'use client';
import { useViewEditorStore } from '@/stores/viewEditorStore';
import { ComposerSection } from './ComposerSection';
import { FilterRuleRow } from './FilterRuleRow';
import { DOMAIN_FIELDS } from '../lib/domainFields';

export function FilterSection() {
  const { domain, filterRules, addFilterRule, updateFilterRule, removeFilterRule } = useViewEditorStore();
  const fields = domain ? (DOMAIN_FIELDS[domain] ?? []) : [];

  return (
    <ComposerSection number={2} title="필터">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filterRules.map((rule, i) => (
          <FilterRuleRow
            key={i}
            rule={rule}
            fields={fields}
            onChange={partial => updateFilterRule(i, partial)}
            onRemove={() => removeFilterRule(i)}
          />
        ))}
        <button
          onClick={addFilterRule}
          style={{
            alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'var(--ou-bg)', boxShadow: 'var(--ou-neu-raised-xs)',
            fontSize: 13, color: 'var(--ou-text-muted)', fontFamily: 'inherit',
          }}
        >
          + 조건 추가
        </button>
      </div>
    </ComposerSection>
  );
}
