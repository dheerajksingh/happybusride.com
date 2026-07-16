const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN    = process.env.META_WHATSAPP_ACCESS_TOKEN;
const OTP_TEMPLATE    = process.env.META_WHATSAPP_OTP_TEMPLATE_NAME ?? "happybusride_otp";
const GRAPH_API_URL   = "https://graph.facebook.com/v21.0";

/**
 * Send a WhatsApp OTP via Meta Cloud API using an Authentication template.
 *
 * Prerequisites in Meta Business Manager:
 *  1. Create a WhatsApp Business Account and add a verified phone number.
 *  2. Create an Authentication template (category: AUTHENTICATION) named by
 *     META_WHATSAPP_OTP_TEMPLATE_NAME (default: "happybusride_otp").
 *     - Body must have one variable {{1}} — the OTP code.
 *     - If the template has a "Copy Code" button (sub_type: url, index 0),
 *       the button component below is included automatically.
 *       Remove it if your template has no button.
 *  3. Generate a permanent System User access token → META_WHATSAPP_ACCESS_TOKEN.
 *  4. Set META_WHATSAPP_PHONE_NUMBER_ID to the numeric ID from the API Setup page.
 *
 * In dev (OTP_DEV_CODE set), skips the API call and just logs.
 */
export async function sendWhatsAppOTP(phone: string, code: string): Promise<void> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "META_WHATSAPP_PHONE_NUMBER_ID or META_WHATSAPP_ACCESS_TOKEN is not set"
      );
    }
    console.log(`[WHATSAPP-OTP-DEV] Phone: ${phone} → Code: ${code}`);
    return;
  }

  const res = await fetch(`${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${phone}`,
      type: "template",
      template: {
        name: OTP_TEMPLATE,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }],
          },
          // Remove this block if your template has no "Copy Code" button.
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta WhatsApp API error ${res.status}: ${body}`);
  }
}

/**
 * Send a freeform WhatsApp text message via Meta Cloud API.
 *
 * Only works within a 24-hour customer-initiated conversation window.
 * For business-initiated messages (e.g. booking confirmations), use an
 * approved template instead.
 */
export async function sendWhatsAppText(phone: string, message: string): Promise<void> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "META_WHATSAPP_PHONE_NUMBER_ID or META_WHATSAPP_ACCESS_TOKEN is not set"
      );
    }
    console.log(`[WHATSAPP-DEV] Phone: ${phone}\n${message}`);
    return;
  }

  const res = await fetch(`${GRAPH_API_URL}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${phone}`,
      type: "text",
      text: { body: message },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta WhatsApp API error ${res.status}: ${body}`);
  }
}
