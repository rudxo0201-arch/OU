import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '0 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 400 }}>
        <MagnifyingGlass size={48} weight="light" color="#9ca3af" />
        <span style={{ fontWeight: 600, fontSize: 18, textAlign: 'center' }}>
          페이지를 찾을 수 없어요
        </span>
        <span style={{ fontSize: 14, color: 'var(--color-dimmed)', textAlign: 'center' }}>
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
        </span>
        <Link
          href="/"
          style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', cursor: 'pointer', fontSize: 14, textDecoration: 'none', color: 'inherit' }}
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
