import Image from 'next/image';

export default function UniversePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        backgroundColor: '#ffffff',
      }}
    >
      <Image
        src="/logo-ou.svg"
        alt="OU"
        width={120}
        height={57}
        priority
      />
      <p
        style={{
          fontSize: '1rem',
          color: '#666666',
          letterSpacing: '0.05em',
          margin: 0,
        }}
      >
        준비중입니다
      </p>
    </div>
  );
}
