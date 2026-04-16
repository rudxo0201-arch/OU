import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@phosphor-icons/react'],
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        // WebContainer requires SharedArrayBuffer → COEP/COOP headers
        // Scoped to view routes where Dev Workspace renders
        source: '/view/:path*',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

const hasSentryDsn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

export default hasSentryDsn
  ? withSentryConfig(nextConfig, {
      silent: true,
      disableLogger: true,
      hideSourceMaps: true,
      tunnelRoute: '/monitoring',
    })
  : nextConfig;
