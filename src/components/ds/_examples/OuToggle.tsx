'use client';
import { useState } from 'react';
import { OuToggle } from '@/components/ds';

function ToggleOff()  { const [on, set] = useState(false); return <OuToggle checked={on} onChange={set} label="알림" />; }
function ToggleOn()   { const [on, set] = useState(true);  return <OuToggle checked={on} onChange={set} label="켜짐" />; }
function ToggleDis()  { return <OuToggle checked={false} disabled label="비활성" />; }

export const OuToggleExamples = [
  { label: 'off', Component: ToggleOff },
  { label: 'on',  Component: ToggleOn },
  { label: 'disabled', Component: ToggleDis },
];
