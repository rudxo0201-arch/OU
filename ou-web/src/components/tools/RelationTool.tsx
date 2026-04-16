'use client';

import { useState } from 'react';
import { UsersThree, Check, ArrowRight } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { registerTool, type ToolProps } from './registry';

const RELATION_TYPES = ['가족', '친구', '직장', '학교', '기타'];
const OPTIONAL_FIELDS = [
  { key: 'birthday', label: '생일' },
  { key: 'contact', label: '연락처' },
  { key: 'memo', label: '메모' },
];

function parseRelation(input: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const nameMatch = input.match(/([가-힣]{2,4})(이|이랑|랑|한테|의|씨|는|가|을|를)?/);
  if (nameMatch) parsed.name = nameMatch[1];
  if (/엄마|아빠|형|누나|오빠|언니|동생|할머니|할아버지|이모|삼촌|고모|사촌/.test(input)) parsed.relationType = '가족';
  else if (/친구|절친|베프/.test(input)) parsed.relationType = '친구';
  else if (/교수|선생|선배|후배|동기|학우|같은 반/.test(input)) parsed.relationType = '학교';
  else if (/팀장|부장|사장|대표|동료|상사|부하|인턴/.test(input)) parsed.relationType = '직장';
  const titleMatch = input.match(/(엄마|아빠|형|누나|오빠|언니|동생|할머니|할아버지|이모|삼촌|고모|사촌|교수님?|선생님?|선배|후배|동기|팀장|부장|사장|대표|친구|절친)/);
  if (titleMatch) parsed.title = titleMatch[1];
  return parsed;
}

export function RelationTool({ rawInput, parsed, onSubmit }: ToolProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(parsed.relationType ?? null);
  const [localParsed, setLocalParsed] = useState(parsed);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  const filledOptional = OPTIONAL_FIELDS.filter(f => localParsed[f.key]);
  const unfilledOptional = OPTIONAL_FIELDS.filter(f => !localParsed[f.key]);

  const handleSubmitField = (key: string) => {
    if (!fieldValue.trim()) return;
    setLocalParsed(prev => ({ ...prev, [key]: fieldValue }));
    onSubmit(`${key}: ${fieldValue}`);
    setFieldValue(''); setEditingField(null);
  };

  return (
    <div style={{ marginTop: 8, border: '0.5px solid var(--color-default-border)', borderRadius: 8, overflow: 'hidden', animation: 'ou-fade-in 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255, 255, 255, 0.04)', borderBottom: '0.5px solid var(--color-default-border)' }}>
        <UsersThree size={14} weight="fill" />
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f3f4f6', color: '#6b7280' }}>인물</span>
        {selectedType && <Check size={12} style={{ color: '#22c55e' }} />}
      </div>

      <div style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {localParsed.name && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>이름</span><span style={{ fontSize: 14, fontWeight: 600 }}>{localParsed.name}</span></div>}
          {localParsed.title && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>관계</span><span style={{ fontSize: 14 }}>{localParsed.title}</span></div>}
          {selectedType && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>분류</span><span style={{ fontSize: 14 }}>{selectedType}</span></div>}
          {filledOptional.map(field => (
            <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'var(--color-dimmed)' }}>{field.label}</span><span style={{ fontSize: 14 }}>{localParsed[field.key]}</span></div>
          ))}
          {!localParsed.name && !localParsed.title && <span style={{ fontSize: 14 }}>{rawInput}</span>}
        </div>
      </div>

      {!selectedType && (
        <div style={{ padding: '0 12px 8px' }}>
          <span style={{ fontSize: 10, color: 'var(--color-dimmed)', display: 'block', marginBottom: 4 }}>어떤 사이인가요?</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {RELATION_TYPES.map(type => (
              <button key={type} onClick={() => { setSelectedType(type); onSubmit(`관계: ${type}`); }}
                style={{ padding: '2px 10px', borderRadius: 14, fontSize: 11, border: '0.5px solid var(--color-default-border)', color: 'var(--color-dimmed)', background: 'none', cursor: 'pointer' }}>{type}</button>
            ))}
          </div>
        </div>
      )}

      {unfilledOptional.length > 0 && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: editingField ? 8 : 0, flexWrap: 'wrap' }}>
            {unfilledOptional.map(field => (
              <button key={field.key} onClick={() => { setEditingField(editingField === field.key ? null : field.key); setFieldValue(''); }}
                style={{ padding: '3px 10px', borderRadius: 14, fontSize: 12, border: '0.5px solid var(--color-default-border)', background: editingField === field.key ? 'rgba(255,255,255,0.06)' : 'transparent', color: 'var(--color-dimmed)', cursor: 'pointer' }}>+ {field.label}</button>
            ))}
          </div>
          {editingField && (
            <input type="text" placeholder={`${OPTIONAL_FIELDS.find(f => f.key === editingField)?.label} 입력`}
              value={fieldValue} onChange={e => setFieldValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmitField(editingField); }}
              autoFocus
              style={{ width: '100%', padding: '4px 8px', fontSize: 12, borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--color-default-border)', boxSizing: 'border-box' }}
            />
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', borderTop: '0.5px solid var(--color-default-border)' }}>
        <button onClick={() => router.push('/my')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-dimmed)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          내 우주에서 보기 <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

registerTool({ id: 'relation', label: '인물', match: (_input, domain) => domain === 'relation', parse: parseRelation, component: RelationTool });
