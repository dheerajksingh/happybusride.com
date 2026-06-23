import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const FROM   = process.env.SES_FROM_EMAIL;

export type EmailMessage = {
  to:       string;
  subject:  string;
  text:     string;
  html?:    string;
};

/**
 * Send a single transactional email via AWS SES.
 * Mirrors the OTP sender: if SES isn't configured (no SES_FROM_EMAIL), it
 * logs to the console instead of failing — so local/dev works out of the box.
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!FROM) {
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
