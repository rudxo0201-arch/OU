'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OrbShell } from '@/components/orb/OrbShell';
import { OrbChat } from '@/components/orb/OrbChat';
import { OrbView } from '@/components/orb/OrbView';
import { getOrbDef } from '@/components/orb/registry';

/** 독립 앱 Orb — OrbShell 없이 자체 레이아웃으로 라우팅 */
const STANDALONE_ORBS: Record<string, string> = {
  note: '/note',
  babylog: '/babylog',
};

export default function OrbPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orb = getOrbDef(slug);

  useEffect(() => {
    if (!orb) { router.replace('/home'); return; }
    // 독립 앱 Orb는 해당 앱 라우트로 redirect
    if (STANDALONE_ORBS[slug]) {
      router.replace(STANDALONE_ORBS[slug]);
    }
  }, [orb, slug, router]);

  if (!orb) return null;
  if (STANDALONE_ORBS[slug]) return null; // redirect 중

  return (
    <OrbShell slug={orb.slug} title={orb.title} icon={orb.icon}>
      {orb.viewType
        ? <OrbView domain={orb.domain} viewType={orb.viewType} orbSlug={orb.slug} placeholder={orb.placeholder} />
        : <OrbChat placeholder={orb.placeholder} />
      }
    </OrbShell>
  );
}
