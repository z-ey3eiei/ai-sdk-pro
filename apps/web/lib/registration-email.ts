
import "server-only";

import { getPlatformConfig } from "./platform-policy";

/** Resend domain mail.ai-sdk.pro must already be verified before activation. */
export async function sendAuthEmail(to: string, subject: string, message: string) {
  const config = getPlatformConfig();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const key = process.env.RESEND_API_KEY?.trim();
  if (!config.emailRegistrationAvailable || !from || !key)
    throw new Error("Registration mail transport is unavailable.");
  if (to.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
      subject.length > 120 || message.length > 4000)
    throw new Error("Invalid transactional email.");
  // Never log recipient, verification URL, reset token or Resend credentials.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: message,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Transactional email dispatch failed.");
}
