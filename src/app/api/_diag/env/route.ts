import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TEMPORARY diagnostic route — reports only presence/length of env vars (never
// their values) and whether the AWS SDK can resolve credentials at runtime.
// Delete this file once the SES/credentials issue is resolved.
const TOKEN = "hbr-diag-7Kq2";

function info(name: string) {
  const v = process.env[name];
  return { present: Boolean(v), length: v ? v.length : 0 };
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const env = {
    NODE_ENV:              process.env.NODE_ENV ?? null,
    AWS_REGION:            info("AWS_REGION"),
    SES_REGION:            info("SES_REGION"),
    SES_FROM_EMAIL:        info("SES_FROM_EMAIL"),
    AWS_BUCKET_NAME:       info("AWS_BUCKET_NAME"),
    AWS_ACCESS_KEY_ID:     info("AWS_ACCESS_KEY_ID"),
    AWS_SECRET_ACCESS_KEY: info("AWS_SECRET_ACCESS_KEY"),
  };

  // Live test: can the AWS SDK's default credential chain resolve at runtime?
  let credResolution: { ok: boolean; detail: string };
  try {
    const { SESClient } = await import("@aws-sdk/client-ses");
    const region =
      process.env.SES_REGION || process.env.AWS_REGION || "us-east-2";
    const client = new SESClient({ region });
    const creds = await client.config.credentials();
    credResolution = {
      ok: true,
      detail: `resolved (accessKeyId length=${creds.accessKeyId?.length ?? 0})`,
    };
  } catch (err) {
    credResolution = {
      ok: false,
      detail: String(err instanceof Error ? err.message : err).slice(0, 200),
    };
  }

  return NextResponse.json({ env, credResolution });
}
