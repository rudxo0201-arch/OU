'use client';

import { useState } from 'react';
import type { ViewProps } from './registry';
import { OuTabs } from '@/components/ds';
import { DSTab } from './admin/DSTab';
import { NodesTab } from './admin/NodesTab';
import { ViewsTab } from './admin/ViewsTab';

const ADMIN_TABS = [
  { key: 'ds', label: 'DS' },
  { key: 'nodes', label: '노드' },
  { key: 'views', label: '뷰' },
];

export function AdminView(_props: ViewProps) {
  const [tab, setTab] = useState('ds');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 탭 바 */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <OuTabs
          tabs={ADMIN_TABS}
          activeKey={tab}
          onChange={setTab}
        />
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'ds' && <DSTab />}
        {tab === 'nodes' && <NodesTab />}
        {tab === 'views' && <ViewsTab />}
      </div>
    </div>
  );
}
