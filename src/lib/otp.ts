import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function generateOTP(): string {
  // In dev, use fixed code for easy testing
  if (process.env.OTP_DEV_CODE) {
    return process.env.OTP_DEV_CODE;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends OTP via MSG91.
 * In dev (OTP_DEV_CODE set), skips the API call and just logs.
 */
async function dispatchSMS(phone: string, code: string): Promise<void> {
  if (process.env.OTP_DEV_CODE) {
    console.log(`[OTP-DEV] Phone: ${phone} → Code: ${code}`);
    return;
  }

  const apiKey     = process.env.MSG91_API_KEY!;
  const templateId = process.env.MSG91_TEMPLATE_ID!;
  const senderId   = process.env.MSG91_SENDER_ID ?? "HPYBSR";

  const res = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: apiKey,
    },
    body: JSON.stringify({
      template_id: templateId,
      mobile: `91${phone}`,   // India country code prefix
      otp: code,
      sender: senderId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MSG91 error ${res.status}: ${text}`);
  }
}

export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  // Rate limit: max 10 OTPs per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.otpRequest.count({
    where: { phone, createdAt: { gte: oneHourAgo } },
  });

  if (recentCount >= 10) {
    return { success: false, message: "Too many OTP requests. Please try after an hour." };
  }

  const code = generateOTP();
  const hashedCode = await hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const user = await prisma.user.findUnique({ where: { phone } });

  await prisma.otpRequest.create({
    data: {
      phone,
      code: hashedCode,
      expiresAt,
      userId: user?.id ?? null,
    },
  });

  await dispatchSMS(phone, code);

  return { success: true, message: "OTP sent successfully" };
}

export async function verifyOTP(
  phone: string,
  code: string
): Promise<{ valid: boolean; userId?: string; isNew?: boolean }> {
  const latestOtp = await prisma.otpRequest.findFirst({
    where: {
      phone,
      usedAt: null,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestOtp) return { valid: false };
  if (latestOtp.attempts >= MAX_ATTEMPTS) return { valid: false };

  const valid = await compare(code, latestOtp.code);

  if (!valid) {
    await prisma.otpRequest.update({
      where: { id: latestOtp.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false };
  }

  await prisma.otpRequest.update({
    where: { id: latestOtp.id },
    data: { usedAt: new Date() },
  });

  let isNew = false;
  let user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    isNew = true;
    user = await prisma.user.create({
      data: { phone, phoneVerified: new Date(), role: "PASSENGER" },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: new Date() },
    });
  }

  return { valid: true, userId: user.id, isNew };
}
