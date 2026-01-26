import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.FLYWHEEL_API_URL || 'http://127.0.0.1:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
