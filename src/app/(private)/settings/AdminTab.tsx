'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AdminTab() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin'); }, [router]);
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ou-text-muted)', fontSize: 13 }}>
      관리자 페이지로 이동 중…
    </div>
  );
}
