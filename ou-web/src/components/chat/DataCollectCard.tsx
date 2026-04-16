'use client';

import { useState } from 'react';

interface DataCollectCardProps {
  recorded: string;
  fields: string[];
  onSubmit: (text: string) => void;
}

export function DataCollectCard({ recorded, fields, onSubmit }: DataCollectCardProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState<string | null>(null);

  const handleFieldClick = (field: string) => {
    setActiveField(activeField === field ? null : field);
  };

  const handleSubmit = () => {
    const filled = Object.entries(values)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (filled) {
      onSubmit(filled);
      setValues({});
      setActiveField(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        border: '0.5px solid var(--ou-border-subtle)',
        borderRadius: 'var(--ou-radius-md)',
        background: 'rgba(255, 255, 255, 0.02)',
      }}
    >
      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', display: 'block', marginBottom: 8 }}>기록됨: {recorded}</span>

      <span style={{ fontSize: 11, color: 'var(--ou-text-dimmed)', display: 'block', marginBottom: 6 }}>추가 정보 (선택)</span>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: activeField ? 8 : 0 }}>
        {fields.map(field => {
          const hasValue = !!values[field]?.trim();
          return (
            <button
              key={field}
              onClick={() => handleFieldClick(field)}
              style={{
                padding: '4px 12px',
                borderRadius: 16,
                fontSize: 13,
                border: '0.5px solid var(--ou-border-subtle)',
                background: hasValue
                  ? 'rgba(255, 255, 255, 0.08)'
                  : activeField === field
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'transparent',
                color: hasValue
                  ? 'var(--ou-text-body)'
                  : 'var(--ou-text-dimmed)',
                transition: 'all 150ms',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {hasValue ? `${field}: ${values[field]}` : `+ ${field}`}
            </button>
          );
        })}
      </div>

      {activeField && (
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder={`${activeField}을(를) 입력하세요`}
            value={values[activeField] ?? ''}
            onChange={e => setValues({ ...values, [activeField]: e.target.value })}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid var(--ou-border-subtle)',
              borderRadius: 'var(--ou-radius-md)',
              padding: '6px 10px',
              fontSize: 12,
              color: 'var(--ou-text-body)',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          {values[activeField]?.trim() ? (
            <button
              onClick={handleSubmit}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 12,
                color: 'var(--ou-text-body)',
                padding: '0 8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              전송
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
