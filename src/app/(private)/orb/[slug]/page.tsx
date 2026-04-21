'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OrbShell } from '@/components/orb/OrbShell';
import { OrbChat } from '@/components/orb/OrbChat';
import { OrbView } from '@/components/orb/OrbView';
import { getOrbDef } from '@/components/orb/registry';

export default function OrbPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orb = getOrbDef(slug);

  useEffect(() => {
    if (!orb) router.replace('/home');
  }, [orb, router]);

  if (!orb) return null;

  return (
    <OrbShell slug={orb.slug} title={orb.title} icon={orb.icon}>
      {orb.viewType
        ? <OrbView domain={orb.domain} viewType={orb.viewType} orbSlug={orb.slug} />
        : <OrbChat placeholder={orb.placeholder} />
      }
    </OrbShell>
  );
}
