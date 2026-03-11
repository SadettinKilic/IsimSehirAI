import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  experimental: {
    // Improve server component logging
  },
};

export default nextConfig;
