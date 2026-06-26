import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// SES, S3, and RDS all live in us-east-2 for this app. Prefer an explicit
// SES_REGION, then AWS_REGION, then fall back to the region everything is in.
const REGION = process.env.SES_REGION ?? process.env.AWS_REGION ?? "us-east-2";
const FROM   = process.env.SES_FROM_EMAIL;

export type EmailMessage = {
  to:       string;
  subject:  string;
  text:     string;
  html?:    string;
};

/**
 * Send a single transactional email via AWS SES.
 *
 * If SES isn't configured (no SES_FROM_EMAIL):
 *  - in production we THROW, so the misconfig surfaces (e.g. as a FAILED outbox
 *    event with a real error) instead of silently pretending to succeed;
 *  - in dev we log to the console so local works without SES.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!FROM) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SES_FROM_EMAIL is not set — cannot send email in production");
    }
    console.log(`[EMAIL-DEV] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return;
  }

  const client = new SESClient({ region: REGION });
  await client.send(
    new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [msg.to] },
      Message: {
        Subject: { Data: msg.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: msg.text, Charset: "UTF-8" },
          ...(msg.html ? { Html: { Data: msg.html, Charset: "UTF-8" } } : {}),
        },
      },
    })
  );
}
