'use client';

import { QSBar } from '@/components/home/QSBar';

export function QSBarWidget({ widgetId: _ }: { widgetId: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '0 8px',
    }}>
      <QSBar />
    </div>
  );
}
