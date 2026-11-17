import { createHash } from "node:crypto";
import { getMosqueSettings } from "@/lib/settings";

export interface BrandInfo {
  name: string;
  logoUrl: string | null;
  version: string;
  iconType: string;
}

const DEFAULT_NAME = "Masjid Abu Dzar";

/** Cache-buster for favicon/PWA icons after an admin uploads a new logo. */
export function logoVersion(logoUrl: string | null | undefined): string {
  return createHash("sha1")
    .update(logoUrl || "default")
    .digest("hex")
    .slice(0, 10);
}

function iconTypeFor(logoUrl: string | null | undefined): string {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(logoUrl ?? "");
  return match ? match[1].toLowerCase() : "image/png";
}

/** Reads the admin-uploaded logo; never throws so metadata/icons stay available. */
export async function getBrand(): Promise<BrandInfo> {
  try {
    const settings = await getMosqueSettings();
    return {
      name: settings.mosqueName || DEFAULT_NAME,
      logoUrl: settings.logoUrl,
      version: logoVersion(settings.logoUrl),
      iconType: iconTypeFor(settings.logoUrl),
    };
  } catch (error) {
    console.error("Gagal memuat brand, memakai ikon bawaan:", error);
    return {
      name: DEFAULT_NAME,
      logoUrl: null,
      version: logoVersion(null),
      iconType: "image/png",
    };
  }
}

export function brandIconUrl(version: string): string {
  return `/api/public/logo?v=${version}`;
}

export function brandManifestUrl(
  variant: "public" | "admin",
  version: string
): string {
  return `/api/public/manifest?variant=${variant}&v=${version}`;
}
