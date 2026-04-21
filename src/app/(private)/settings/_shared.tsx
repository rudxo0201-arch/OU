'use client';

export function Section({ title, children, sub }: { title: string; children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ou-text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {title}
        </h2>
        {sub && <span style={{ fontSize: 11, color: 'var(--ou-text-disabled)', fontWeight: 400 }}>{sub}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>{children}</div>
    </div>
  );
}

export function Row({ label, value, action }: { label: string; value?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--ou-border-subtle)', gap: 16 }}>
      <span style={{ fontSize: 14, color: 'var(--ou-text-secondary)' }}>{label}</span>
      {action ?? <span style={{ fontSize: 14, color: 'var(--ou-text-strong)', fontWeight: 500 }}>{value}</span>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--ou-text-secondary)', letterSpacing: '0.2px' }}>{label}</label>
      {children}
    </div>
  );
}
