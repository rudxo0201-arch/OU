'use client';
import { useState } from 'react';
import { OuCheckbox } from '@/components/ds';

function CBUnchecked() { const [v, s] = useState(false); return <OuCheckbox checked={v} onChange={s} label="체크박스" />; }
function CBChecked()   { const [v, s] = useState(true);  return <OuCheckbox checked={v} onChange={s} label="선택됨" />; }

export const OuCheckboxExamples = [
  { label: 'unchecked', Component: CBUnchecked },
  { label: 'checked',   Component: CBChecked },
];
