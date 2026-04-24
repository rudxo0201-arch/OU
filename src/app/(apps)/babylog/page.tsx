'use client';

import { OrbShell } from '@/components/orb/OrbShell';
import { BabyLogView } from '@/components/orb/views/BabyLogView';

export default function BabyLogPage() {
  return (
    <OrbShell slug="babylog" title="베이비로그" icon="◐">
      <BabyLogView />
    </OrbShell>
  );
}
