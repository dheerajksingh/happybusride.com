import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Auth
    DATABASE_URL:    process.env.DATABASE_URL    || "",
    AUTH_SECRET:     process.env.AUTH_SECRET     || "",
    AUTH_TRUST_HOST: "1",
    NEXTAUTH_URL:    process.env.NEXTAUTH_URL    || "",

    // AI
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",

    // Redis (Upstash)
    UPSTASH_REDIS_REST_URL:   process.env.UPSTASH_REDIS_REST_URL   || "",
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",

    // Google Maps
    GOOGLE_MAPS_API_KEY:             process.env.GOOGLE_MAPS_API_KEY             || "",
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",

    // AWS (S3 + SES) — region, bucket, and sender are non-secret config.
    // Credentials intentionally NOT here — supplied via IAM role on the compute.
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || "happybusride-s3",
    AWS_REGION:      process.env.AWS_REGION      || "us-east-2",
    SES_FROM_EMAIL:  process.env.SES_FROM_EMAIL  || "notification@happybusride.com",

    // SMS / OTP
    MSG91_API_KEY:     process.env.MSG91_API_KEY     || "",
    MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID || "",
    MSG91_SENDER_ID:   process.env.MSG91_SENDER_ID   || "",
    OTP_DEV_CODE:      process.env.OTP_DEV_CODE      || "",

    // File uploads
    UPLOAD_DIR: process.env.UPLOAD_DIR || "",
  },
};

export default nextConfig;
