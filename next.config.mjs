import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = withPWA({
  cacheOnFrontEndNav: process.env.NODE_ENV !== 'development',
  aggressiveFrontEndNavCaching: process.env.NODE_ENV !== 'development',
  reloadOnOnline: true,
  swcMinify: true,
  dest: "public",
  cacheStartUrl: true,
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: '/home',
  fallbacks: {
    //image: "/static/images/fallback.png",
    document: "/offline", // if you want to fallback to a custom page rather than /_offline
    // font: '/static/font/fallback.woff2',
    // audio: ...,
    // video: ...,
  },
  workboxOptions: {
    disableDevLogs: true,
  },
  disable: process.env.NODE_ENV === 'development'
});

export default nextConfig;
