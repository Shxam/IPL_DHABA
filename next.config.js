const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const supabaseImageHostname = (() => {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!rawUrl) return undefined;

  try {
    return new URL(rawUrl).hostname;
  } catch {
    return undefined;
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lucide-react', 'react-map-gl'],
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseImageHostname
      ? [{ protocol: 'https', hostname: supabaseImageHostname }]
      : [],
  },
};

module.exports = withPWA(nextConfig);

// Injected by Sentry
const { withSentryConfig } = require('@sentry/nextjs');
module.exports = withSentryConfig(
  module.exports,
  {
    silent: true,
    org: 'ipl-dhaba',
    project: 'javascript-nextjs',
  },
  {
    widenClientSandbox: true,
    transpileClientSDK: true,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
  }
);
