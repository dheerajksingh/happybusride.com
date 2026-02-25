import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "",
    AUTH_SECRET: process.env.AUTH_SECRET || "",
    AUTH_TRUST_HOST: "1",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "",
  },
};

export default nextConfig;
