/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // No ESLint setup is included; type errors still fail the build.
  eslint: { ignoreDuringBuilds: true },
  // postgres opens raw sockets, so it must not be bundled for the edge.
  serverExternalPackages: ['postgres'],
  // The site applies db/*.sql itself on start (src/instrumentation.ts), so hosts that copy
  // only the files the server needs must include them.
  outputFileTracingIncludes: { '/*': ['./db/*.sql'] },
  experimental: {
    serverActions: { bodySizeLimit: '7mb' }, // news photos up to 6 MB, CSV uploads
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
      { source: '/score/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
};

export default nextConfig;
