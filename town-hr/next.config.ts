import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/attendance/leave', destination: '/leave', permanent: true },
      { source: '/attendance/leave/request', destination: '/leave/request', permanent: true },
    ];
  },
};

export default nextConfig;
