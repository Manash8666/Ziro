import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ziro/ui-kit', '@ziro/shared-types'],
};

export default withPayload(nextConfig);
