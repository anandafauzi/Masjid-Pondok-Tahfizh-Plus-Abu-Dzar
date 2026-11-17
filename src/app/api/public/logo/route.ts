import { NextResponse } from "next/server";
import { getMosqueSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const NO_STORE = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
const FALLBACK_ICON = "/icon-512.png";

/**
 * Serves the logo uploaded from the admin panel as the web favicon / PWA icon.
 * Data URLs are decoded here; a plain http(s) URL is redirected, and anything
 * else falls back to the bundled static icon.
 */
export async function GET(request: Request) {
  let logoUrl: string | null = null;
  try {
    const settings = await getMosqueSettings();
    logoUrl = settings.logoUrl;
  } catch (error) {
    console.error("Gagal memuat logo untuk ikon:", error);
  }

  if (logoUrl) {
    const dataUrl = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(
      logoUrl
    );
    if (dataUrl) {
      const bytes = Buffer.from(dataUrl[2].replace(/\s/g, ""), "base64");
      if (bytes.length > 0) {
        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            "Content-Type": dataUrl[1].toLowerCase(),
            "Cache-Control": NO_STORE,
          },
        });
      }
    }

    if (/^https?:\/\//i.test(logoUrl)) {
      return NextResponse.redirect(logoUrl, {
        status: 307,
        headers: { "Cache-Control": NO_STORE },
      });
    }
  }

  return NextResponse.redirect(new URL(FALLBACK_ICON, request.url), {
    status: 307,
    headers: { "Cache-Control": NO_STORE },
  });
}
