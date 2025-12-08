import type { NextConfig } from 'next';

import config from './package.json' with { type: 'json' };

const nextConfig: NextConfig = {
  env: { version: config.version },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client');
    }
    return config;
  },
};

export default nextConfig;
