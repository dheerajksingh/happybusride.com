import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppOTP } from "@/lib/whatsapp";

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

  const apiKey     = process.env.MSG91_API_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!apiKey || !templateId) {
    throw new Error("MSG91_API_KEY or MSG91_TEMPLATE_ID is not set");
  }

  const params = new URLSearchParams({
    template_id: templateId,
    mobile: `91${phone}`,   // India country code prefix
    otp: code,
    otp_expiry: String(OTP_EXPIRY_MINUTES),
  });

  const res = await fetch(`https://control.msg91.com/api/v5/otp?${params}`, {
    method: "POST",
    headers: { authkey: apiKey },
  });

  // MSG91 responds 200 even on failures — success is signalled in the body.
  const text = await res.text();
  let parsed: { type?: string } | undefined;
  try { parsed = JSON.parse(text); } catch { /* non-JSON body falls through to error below */ }

  if (!res.ok || parsed?.type !== "success") {
    throw new Error(`MSG91 error ${res.status}: ${text}`);
  }
}

export type OTPChannel = "sms" | "whatsapp" | "both";

export async function sendOTP(
  phone: string,
  channel: OTPChannel = "sms",
): Promise<{ success: boolean; message: string }> {
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

  if (channel === "sms" || channel === "both") {
    await dispatchSMS(phone, code);
  }
  if (channel === "whatsapp" || channel === "both") {
    await sendWhatsAppOTP(phone, code);
  }

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

  const { userId, isNew } = await upsertVerifiedUser(phone);
  return { valid: true, userId, isNew };
}

export async function upsertVerifiedUser(
  phone: string
): Promise<{ userId: string; isNew: boolean }> {
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

  return { userId: user.id, isNew };
}

/**
 * Records an OTP verification that happened client-side (MSG91 widget) as an
 * already-used OtpRequest row. The NextAuth "otp" provider consumes this row
 * as one-time, server-side proof that the phone was verified.
 */
export async function recordWidgetVerification(phone: string, userId: string): Promise<void> {
  await prisma.otpRequest.create({
    data: {
      phone,
      // Placeholder hash — verification happened on MSG91's side, never compared.
      code: await hash(Math.random().toString(36).slice(2), 10),
      expiresAt: new Date(),
      usedAt: new Date(),
      userId,
    },
  });
}
