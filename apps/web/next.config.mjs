/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile shared workspace packages so Next can bundle their TS source.
  transpilePackages: ['@audio-to-text/shared', '@audio-to-text/db', '@audio-to-text/core'],
  webpack: (config) => {
    // Our workspace packages use ESM-style `.js` specifiers that actually point
    // at `.ts` source. Teach webpack to resolve `.js` → `.ts` when bundling them.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
