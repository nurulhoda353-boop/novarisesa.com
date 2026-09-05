import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { APPS_GATE_COOKIE, appsGateSignature } from "@/lib/apps-gate";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

export async function POST(request: Request) {
  const expected = process.env.APPS_PAGE_PASSWORD;
  const secret = process.env.APPS_GATE_SECRET;
  if (!expected || !secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const provided = typeof body?.password === "string" ? body.password : "";

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  const matches =
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);

  if (!matches) {
    return NextResponse.json({ error: "incorrect_password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(APPS_GATE_COOKIE, appsGateSignature(expected, secret), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/apps",
  });
  return response;
}
