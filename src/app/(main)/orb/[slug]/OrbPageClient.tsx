'use client';

import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { OrbShell } from '@/components/orb/OrbShell';
import { OrbAssistant } from '@/components/orb/OrbAssistant';
import { OrbView } from '@/components/orb/OrbView';
import type { OrbDef } from '@/components/orb/registry';

dayjs.locale('ko');

interface OrbPageClientProps {
  orb: OrbDef;
  initialNodes: any[];
}

export function OrbPageClient({ orb, initialNodes }: OrbPageClientProps) {
  const subtitle = orb.slug === 'calendar'
    ? dayjs().format('MMMM YYYY')
    : undefined;

  return (
    <OrbShell slug={orb.slug} title={orb.title} icon={orb.icon} subtitle={subtitle}>
      {orb.viewType
        ? <OrbView
            domain={orb.domain}
            viewType={orb.viewType}
            orbSlug={orb.slug}
            placeholder={orb.placeholder}
            initialNodes={initialNodes}
          />
        : <OrbAssistant placeholder={orb.placeholder} />
      }
    </OrbShell>
  );
}
