'use client';

/**
 * /ds — OU 디자인 시스템 페이지
 *
 * Phase 1: design-system-preview.html (시각 명세 원본) iframe 임베드
 * Phase 2: 각 섹션을 live React DS 컴포넌트로 점진 이식
 *
 * 시각 명세 원본: public/design-system-preview.html
 * DS 컴포넌트 레지스트리: src/components/ds/registry.ts
 * DS 거버넌스: src/components/ds/GOVERNANCE.md
 */

export default function DsPage() {
  return (
    <iframe
      src="/design-system-preview.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
      title="OU Design System"
    />
  );
}
