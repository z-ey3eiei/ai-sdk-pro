import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  transpilePackages: ['@aisdkpro/ui'],
  devIndicators: false,
  allowedDevOrigins: ['*.manus.computer'],
  poweredByHeader: false,
  experimental: {
    cpus: 2,
  },
};

export default config;
