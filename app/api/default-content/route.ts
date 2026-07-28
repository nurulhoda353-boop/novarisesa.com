import { NextRequest, NextResponse } from "next/server";
import en from "@/i18n/locales/en.json";
import ar from "@/i18n/locales/ar.json";

export function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
  return NextResponse.json(locale === "ar" ? ar : en, {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
