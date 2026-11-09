import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Standalone output only for the Docker image build (Dockerfile sets
  // NEXT_OUTPUT=standalone); local `next build` + `next start` otherwise
  // trips the "standalone does not work with next start" warning.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  // Self-hosted deployments do not need to advertise the framework version.
  poweredByHeader: false,
  serverExternalPackages: ['better-sqlite3', 'puppeteer-core', '@sparticuz/chromium-min'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          // 70 MB of font files are revalidated on every page load otherwise.
          // Names are stable, so a week of caching is safe; replace the file
          // name when shipping a new font.
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
