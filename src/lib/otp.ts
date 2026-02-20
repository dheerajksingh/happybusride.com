import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function generateOTP(): string {
  // In dev, use fixed code for easy testing
  if (process.env.NODE_ENV === "development" && process.env.OTP_DEV_CODE) {
    return process.env.OTP_DEV_CODE;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  // Rate limit: max 3 OTPs per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.otpRequest.count({
    where: { phone, createdAt: { gte: oneHourAgo } },
  });

  if (recentCount >= 3) {
    return { success: false, message: "Too many OTP requests. Please try after an hour." };
  }

  const code = generateOTP();
  const hashedCode = await hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Find existing user
  const user = await prisma.user.findUnique({ where: { phone } });

  await prisma.otpRequest.create({
    data: {
      phone,
      code: hashedCode,
      expiresAt,
      userId: user?.id ?? null,
    },
  });

  // Mock SMS: log to console in dev, integrate Twilio/MSG91 in prod
  console.log(`[OTP] Phone: ${phone} → Code: ${code} (expires in ${OTP_EXPIRY_MINUTES} min)`);

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

  if (!latestOtp) {
    return { valid: false };
  }

  if (latestOtp.attempts >= MAX_ATTEMPTS) {
    return { valid: false };
  }

  const valid = await compare(code, latestOtp.code);

  if (!valid) {
    await prisma.otpRequest.update({
      where: { id: latestOtp.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false };
  }

  // Mark OTP as used
  await prisma.otpRequest.update({
    where: { id: latestOtp.id },
    data: { usedAt: new Date() },
  });

  // Upsert user
  let isNew = false;
  let user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    isNew = true;
    user = await prisma.user.create({
      data: {
        phone,
        phoneVerified: new Date(),
        role: "PASSENGER",
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: new Date() },
    });
  }

  return { valid: true, userId: user.id, isNew };
}
