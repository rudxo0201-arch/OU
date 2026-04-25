'use client';
import { OuButton } from '@/components/ds';

export const OuButtonExamples = [
  { label: 'default',   Component: () => <OuButton>기본 버튼</OuButton> },
  { label: 'accent',    Component: () => <OuButton variant="accent">확인</OuButton> },
  { label: 'ghost',     Component: () => <OuButton variant="ghost">취소</OuButton> },
  { label: 'danger',    Component: () => <OuButton variant="danger">삭제</OuButton> },
  { label: 'loading',   Component: () => <OuButton loading>저장 중</OuButton> },
  { label: 'size: sm',  Component: () => <OuButton size="sm">작은 버튼</OuButton> },
  { label: 'size: lg',  Component: () => <OuButton size="lg">큰 버튼</OuButton> },
  { label: 'fullWidth', Component: () => <div style={{ width: 200 }}><OuButton fullWidth>전체 너비</OuButton></div> },
];
