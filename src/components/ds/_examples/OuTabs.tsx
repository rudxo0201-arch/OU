'use client';
import { useState } from 'react';
import { OuTabs } from '@/components/ds';

function TabsDefault() {
  const [active, setActive] = useState('a');
  return (
    <OuTabs
      tabs={[{ key: 'a', label: '일정' }, { key: 'b', label: '할일' }, { key: 'c', label: '습관' }]}
      activeKey={active}
      onChange={setActive}
    />
  );
}

export const OuTabsExamples = [
  { label: 'default', Component: TabsDefault },
];
