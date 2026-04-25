'use client';
import { OuInput } from '@/components/ds';

export const OuInputExamples = [
  { label: 'default',  Component: () => <OuInput placeholder="입력하세요" style={{ width: 240 }} /> },
  { label: 'label',    Component: () => <OuInput label="이름" placeholder="홍길동" style={{ width: 240 }} /> },
  { label: 'error',    Component: () => <OuInput label="이메일" error="올바른 이메일을 입력하세요" placeholder="me@ou.com" style={{ width: 240 }} /> },
  { label: 'size: sm', Component: () => <OuInput size="sm" placeholder="sm 입력" style={{ width: 200 }} /> },
];
