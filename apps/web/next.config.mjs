/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile shared workspace packages so Next can bundle their TS source.
  transpilePackages: ['@audio-to-text/shared', '@audio-to-text/db'],
};

export default nextConfig;
