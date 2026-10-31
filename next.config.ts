import type { NextConfig } from 'next';

import config from './package.json' with { type: 'json' };

const nextConfig: NextConfig = {
  env: { version: config.version },
  // Local SGAuth only works on *.sga.localhost (see README).
  allowedDevOrigins: ['vaultz.sga.localhost'],
};

export default nextConfig;
