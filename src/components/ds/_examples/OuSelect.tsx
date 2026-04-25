'use client';
import { useState } from 'react';
import { OuSelect } from '@/components/ds';

function SelectDefault() {
  const [v, setV] = useState('schedule');
  return (
    <OuSelect
      value={v}
      onChange={setV}
      options={[
        { value: 'schedule', label: '일정' },
        { value: 'task', label: '할일' },
        { value: 'habit', label: '습관' },
      ]}
      style={{ width: 160 }}
    />
  );
}

export const OuSelectExamples = [
  { label: 'default', Component: SelectDefault },
];
