'use client';

export function OuLoader({ size = 80 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size * 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg
        viewBox="0 0 2022 904"
        width="100%"
        height="100%"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'ou-loader-pulse 1.8s ease-in-out infinite' }}
      >
        <path d="M13.3564 623.524C412.651 787.162 720.228 868.577 1022.83 868.748C1325.35 868.919 1624.61 787.885 2007.24 623.639L2021.14 656.004C1636.38 821.162 1332.08 904.142 1022.8 903.968C713.604 903.793 401.123 820.505 0 656.118L13.3564 623.524ZM1010.43 0C1221.16 0.00022292 1391.98 170.824 1391.98 381.545C1391.98 592.266 1221.16 763.09 1010.43 763.09C799.713 763.09 628.89 592.266 628.89 381.545C628.89 170.824 799.713 0 1010.43 0Z" />
      </svg>
    </div>
  );
}

export function OuLoaderFullscreen() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ou-bg)',
      zIndex: 9999,
    }}>
      <OuLoader size={120} />
    </div>
  );
}
