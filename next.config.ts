import type { NextConfig } from 'next';

import config from './package.json' with { type: 'json' };

const nextConfig: NextConfig = {
  env: { version: config.version },
  // Externalize Prisma client to prevent bundling issues with WASM modules
  serverExternalPackages: ['@prisma/client', '@prisma/engines'],
};

export default nextConfig;
