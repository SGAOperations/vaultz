import type { NextConfig } from 'next';

import config from './package.json' with { type: 'json' };

const nextConfig: NextConfig = { env: { version: config.version } };

export default nextConfig;
