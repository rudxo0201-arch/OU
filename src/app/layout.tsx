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
    <html lang="ko" className={orbitron.variable} data-theme="light" data-palette="sunrise" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try{
            var t=localStorage.getItem('ou-theme');
            var p=localStorage.getItem('ou-palette');
            if(t)document.documentElement.setAttribute('data-theme',t);
            if(p)document.documentElement.setAttribute('data-palette',p);
          }catch(e){}
        `}} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e8ecf1" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
