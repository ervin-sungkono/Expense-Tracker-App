import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  cacheOnFrontEndNav: process.env.NODE_ENV !== 'development',
  aggressiveFrontEndNavCaching: process.env.NODE_ENV !== 'development',
  extendDefaultRuntimeCaching: true,
  reloadOnOnline: true,
  dest: 'public',
  cacheStartUrl: true,
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: '/home',
  fallbacks: {
    //image: "/static/images/fallback.png",
    document: '/offline', // if you want to fallback to a custom page rather than /_offline
    // font: '/static/font/fallback.woff2',
    // audio: ...,
    // video: ...,
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /\/(?:share|api\/public-shares)(?:\/|$)/i,
        handler: 'NetworkOnly',
        options: { cacheName: 'public-share-network-only' },
      },
      {
        urlPattern: /\/(?:api\/mcp|\.well-known\/oauth-protected-resource)(?:\/|$)/i,
        handler: 'NetworkOnly',
        options: { cacheName: 'mcp-network-only' },
      },
    ],
  },
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/invite',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/api/invitations/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
      {
        source: '/share/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/api/public-shares/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/api/mcp',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
      {
        source: '/.well-known/oauth-protected-resource/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
