import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['121.55.188.93', 'localhost:3000'],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;