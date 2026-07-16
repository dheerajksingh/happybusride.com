import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOTP, type OTPChannel } from "@/lib/otp";

const schema = z.object({
  phone:   z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  channel: z.enum(["sms", "whatsapp", "both"]).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, channel } = schema.parse(body);

    const result = await sendOTP(phone, (channel as OTPChannel) ?? "sms");

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 429 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("[otp/send]", err);
    return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 500 });
  }
}
