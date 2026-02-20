import { NextResponse } from "next/server";
import { z } from "zod";
import { sendOTP } from "@/lib/otp";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    const result = await sendOTP(phone);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 429 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
