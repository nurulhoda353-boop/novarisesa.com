import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "https://novarisesa.com";
  try {
    const response = await fetch(`${siteUrl}/api/default-content?locale=${locale}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error("Default content unavailable");
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({});
  }
}
