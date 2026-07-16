import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertVerifiedUser, recordWidgetVerification } from "@/lib/otp";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  accessToken: z.string().min(1, "Missing access token"),
});

/** Decode a JWT payload without verifying the signature (MSG91 verifies it). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Verifies an MSG91 OTP-widget access token server-side, then records the
 * verification so the NextAuth "otp" provider will accept a sign-in for this
 * phone. Client flow: widget verifyOtp() → access token → this endpoint →
 * signIn("otp", { phone }).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, accessToken } = schema.parse(body);

    const authkey = process.env.MSG91_API_KEY;
    if (!authkey) {
      console.error("[otp/widget-verify] MSG91_API_KEY is not set");
      return NextResponse.json({ error: "OTP service unavailable" }, { status: 500 });
    }

    const res = await fetch("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authkey, "access-token": accessToken }),
    });

    const text = await res.text();
    let parsed: { type?: string } | undefined;
    try { parsed = JSON.parse(text); } catch { /* handled below */ }

    if (!res.ok || parsed?.type !== "success") {
      console.error(`[otp/widget-verify] MSG91 rejected token (${res.status}): ${text}`);
      return NextResponse.json({ error: "OTP verification failed" }, { status: 401 });
    }

    // Bind the token to the phone being signed in — the token's identifier
    // must be the number MSG91 actually verified.
    const payload = decodeJwtPayload(accessToken);
    const identifier = payload?.identifier ?? payload?.mobile ?? payload?.phone;
    if (identifier !== `91${phone}`) {
      console.error(
        `[otp/widget-verify] token identifier mismatch: expected 91${phone}, ` +
        `token payload: ${JSON.stringify(payload)}`
      );
      return NextResponse.json({ error: "OTP verification failed" }, { status: 401 });
    }

    const { userId, isNew } = await upsertVerifiedUser(phone);
    await recordWidgetVerification(phone, userId);

    return NextResponse.json({ success: true, isNew });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("[otp/widget-verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
