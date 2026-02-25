import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AUTH_TRUST_HOST: "1",
  },
};

export default nextConfig;
