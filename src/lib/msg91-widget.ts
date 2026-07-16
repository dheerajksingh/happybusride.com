"use client";

/**
 * MSG91 OTP-widget client SDK wrapper (headless mode).
 *
 * Loads https://verify.msg91.com/otp-provider.js once and exposes promise
 * wrappers around the window.sendOtp / retryOtp / verifyOtp methods.
 * verifyOtp resolves with an access token that must be validated server-side
 * via POST /api/otp/widget-verify before signing in.
 *
 * Setup (MSG91 dashboard → OTP → Widgets):
 *  - Create a widget, enable your channels (SMS / WhatsApp / Email).
 *  - MSG91_WIDGET_ID = the widget ID, MSG91_TOKEN_AUTH = the widget token.
 *    Both are exposed to the browser via next.config.ts (public by design).
 *
 * When these vars are unset (local dev), isOtpWidgetEnabled() is false and
 * the app falls back to the server-side /api/otp/send + /api/otp/verify flow.
 */

const WIDGET_ID = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
const TOKEN_AUTH = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;
const SCRIPT_URL = "https://verify.msg91.com/otp-provider.js";

type WidgetResponse = { type?: string; message?: string };
type WidgetSuccess = (data: WidgetResponse) => void;
type WidgetFailure = (error: unknown) => void;

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success?: WidgetSuccess, failure?: WidgetFailure) => void;
    retryOtp?: (channel: string | null, success?: WidgetSuccess, failure?: WidgetFailure) => void;
    verifyOtp?: (otp: string, success?: WidgetSuccess, failure?: WidgetFailure) => void;
  }
}

export function isOtpWidgetEnabled(): boolean {
  return Boolean(WIDGET_ID && TOKEN_AUTH);
}

let loadPromise: Promise<void> | null = null;

export function loadOtpWidget(): Promise<void> {
  if (!isOtpWidgetEnabled()) {
    return Promise.reject(new Error("MSG91 OTP widget is not configured"));
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      window.initSendOTP?.({
        widgetId: WIDGET_ID,
        tokenAuth: TOKEN_AUTH,
        exposeMethods: true, // headless — we render our own login/verify UI
        success: () => {},
        failure: () => {},
      });
      resolve();
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load the OTP service. Check your connection and retry."));
    };
    document.body.appendChild(script);
  });
  return loadPromise;
}

function toError(e: unknown): Error {
  if (typeof e === "object" && e !== null && "message" in e) {
    return new Error(String((e as WidgetResponse).message));
  }
  return new Error("OTP service error. Please try again.");
}

export async function widgetSendOtp(phone: string): Promise<void> {
  await loadOtpWidget();
  return new Promise((resolve, reject) => {
    if (!window.sendOtp) return reject(new Error("OTP widget not ready"));
    window.sendOtp(`91${phone}`, () => resolve(), (e) => reject(toError(e)));
  });
}

/** Resend on the default channel of the current widget transaction. */
export async function widgetRetryOtp(): Promise<void> {
  await loadOtpWidget();
  return new Promise((resolve, reject) => {
    if (!window.retryOtp) return reject(new Error("OTP widget not ready"));
    window.retryOtp(null, () => resolve(), (e) => reject(toError(e)));
  });
}

/** Resolves with the MSG91 access token on successful verification. */
export async function widgetVerifyOtp(otp: string): Promise<string> {
  await loadOtpWidget();
  return new Promise((resolve, reject) => {
    if (!window.verifyOtp) return reject(new Error("OTP widget not ready"));
    window.verifyOtp(
      otp,
      (data) => {
        if (data?.message) resolve(data.message);
        else reject(new Error("OTP service returned no access token"));
      },
      (e) => reject(toError(e))
    );
  });
}
