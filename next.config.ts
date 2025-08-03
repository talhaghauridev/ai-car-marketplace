import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
