'use client';

import { useState } from 'react';
import type { ViewProps } from './registry';
import { GlassTabs } from '@/components/ds';
import { DSTab } from './admin/DSTab';

const ADMIN_TABS = [
  { key: 'ds', label: 'DS' },
  // 추후 추가
  // { key: 'nodes', label: '노드' },
  // { key: 'members', label: '멤버' },
  // { key: 'views', label: '뷰' },
];

export function AdminView(_props: ViewProps) {
  const [tab, setTab] = useState('ds');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 탭 바 */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <GlassTabs
          tabs={ADMIN_TABS}
          activeKey={tab}
          onChange={setTab}
        />
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'ds' && <DSTab />}
      </div>
    </div>
  );
}
