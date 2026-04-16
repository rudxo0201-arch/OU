import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import 'xterm/css/xterm.css';
import './globals.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { Orbitron } from 'next/font/google';
import { theme } from '@/theme';
import { AuthProvider } from '@/components/ui/AuthProvider';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  display: 'swap',
  variable: '--font-orbitron',
});

export const metadata = {
  title: 'OU — Just talk.',
  description: '대화하는 족족 데이터가 됩니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={orbitron.variable}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
        <link rel="icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#060810" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <ModalsProvider>
            <Notifications position="top-right" />
            <AuthProvider>
              {children}
            </AuthProvider>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
