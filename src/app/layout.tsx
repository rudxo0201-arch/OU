import './globals.css';

import { Orbitron, DM_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/ui/AuthProvider';
import { ToastProvider } from '@/components/ds';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-orbitron',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-dm-sans',
});

export const metadata = {
  title: 'OU — Just talk.',
  description: '대화하는 족족 데이터가 됩니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${orbitron.variable} ${dmSans.variable}`} data-palette="cosmos" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try{
            var t=localStorage.getItem('ou-theme')||'dark';
            if(t==='auto')t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
            document.documentElement.dataset.theme=t;
            var p=localStorage.getItem('ou-palette');
            if(p)document.documentElement.setAttribute('data-palette',p);
          }catch(e){}
        `}} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
