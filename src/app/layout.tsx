import './globals.css';

import { Orbitron } from 'next/font/google';
import { AuthProvider } from '@/components/ui/AuthProvider';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-orbitron',
});

export const metadata = {
  title: 'OU — Just talk.',
  description: '대화하는 족족 데이터가 됩니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={orbitron.variable} data-theme="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#060810" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ background: '#060810', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
