'use client';

import { useState } from 'react';
import { Button } from '@mantine/core';
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
    <Button
      variant="outline"
      color="dark"
      size="md"
      style={{ borderWidth: '0.5px' }}
      loading={loading}
      onClick={handleJoin}
    >
      참가하기
    </Button>
  );
}
