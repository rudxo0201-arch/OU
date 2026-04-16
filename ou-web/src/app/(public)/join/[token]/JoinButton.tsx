'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function JoinButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member' }),
      });
      if (res.ok) {
        router.push(`/groups/${groupId}`);
      } else {
        const data = await res.json();
        if (data.error === 'Already a member') {
          router.push(`/groups/${groupId}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      style={{
        padding: '10px 24px',
        border: '0.5px solid #1a1a1a',
        borderRadius: 6,
        background: 'transparent',
        cursor: loading ? 'default' : 'pointer',
        fontSize: 14,
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? '...' : '참가하기'}
    </button>
  );
}
