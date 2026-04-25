export default function OrbLoading() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0a0a0f' }}>
      {/* header skeleton */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 10,
        background: 'var(--ou-glass, rgba(10,10,15,0.8))',
        borderBottom: '1px solid var(--ou-hairline-strong, rgba(255,255,255,0.06))',
      }}>
        {/* back button placeholder */}
        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
        {/* title placeholder */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ width: 80, height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }} />
        </div>
        {/* close button placeholder */}
        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* content area skeleton */}
      <div style={{ paddingTop: 52, minHeight: '100vh', padding: '68px 24px 24px' }}>
        {[160, 120, 200, 100, 140].map((w, i) => (
          <div key={i} style={{
            height: 14,
            width: w,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.05)',
            marginBottom: 16,
          }} />
        ))}
      </div>
    </div>
  );
}
