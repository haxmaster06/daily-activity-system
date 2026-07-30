import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Dibutuhkan image Docker yang ramping (lihat docker/frontend.Dockerfile)
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
