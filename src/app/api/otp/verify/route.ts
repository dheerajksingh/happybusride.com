import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOTP } from "@/lib/otp";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  code: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, code } = schema.parse(body);

    const result = await verifyOTP(phone, code);

    if (!result.valid) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      isNew: result.isNew,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
