import type { NextConfig } from 'next';
import path from 'node:path';
const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  transpilePackages: ['@aisdkpro/ui'],
  devIndicators: false,
  allowedDevOrigins: ['*.manus.computer'],
  poweredByHeader: false,
};
export default config;
