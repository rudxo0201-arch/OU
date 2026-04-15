/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@phosphor-icons/react'],
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

export default nextConfig;
