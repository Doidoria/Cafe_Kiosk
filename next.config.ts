import type { NextConfig } from "next";

const FIREBASE_PROJECT_ID = "dotaikun-web"; 

const nextConfig: NextConfig = {
  allowedDevOrigins: ['121.55.188.93', 'localhost:3000'],
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: `/v0/b/${FIREBASE_PROJECT_ID}.appspot.com/**`,
      },
    ],
  },
};

export default nextConfig;