import { createHmac } from "crypto";

/** Shared between the /apps page (verifies the cookie) and the verify API
 * route (issues it) so the two can never drift out of sync. */
export const APPS_GATE_COOKIE = "apps_gate";

export function appsGateSignature(password: string, secret: string): string {
  return createHmac("sha256", secret).update(password).digest("hex");
}

export function isAppsGateAuthorized(cookieValue: string | undefined): boolean {
  const expected = process.env.APPS_PAGE_PASSWORD;
  const secret = process.env.APPS_GATE_SECRET;
  if (!cookieValue || !expected || !secret) return false;
  return cookieValue === appsGateSignature(expected, secret);
}
