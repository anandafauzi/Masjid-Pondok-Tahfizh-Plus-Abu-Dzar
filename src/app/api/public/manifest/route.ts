import { NextResponse } from "next/server";
import { brandIconUrl, getBrand } from "@/lib/brand";
import publicManifest from "../../../../../public/manifest.json";
import adminManifest from "../../../../../public/manifest-admin.json";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const variant =
    new URL(request.url).searchParams.get("variant") === "admin"
      ? "admin"
      : "public";
  const brand = await getBrand();
  const icon = brandIconUrl(brand.version);
  const base = variant === "admin" ? adminManifest : publicManifest;
  const isAdmin = variant === "admin";

  const manifest = {
    ...base,
    name: isAdmin ? `Admin DKM - ${brand.name}` : brand.name,
    short_name: isAdmin ? "Admin DKM" : brand.name,
    description: isAdmin
      ? `Panel Administrasi ${brand.name}`
      : `Sistem Informasi & Jadwal Shalat ${brand.name}`,
    icons: [
      {
        src: icon,
        sizes: "192x192",
        type: brand.iconType,
        purpose: "any",
      },
      {
        src: icon,
        sizes: "512x512",
        type: brand.iconType,
        purpose: "any",
      },
      {
        src: icon,
        sizes: "512x512",
        type: brand.iconType,
        purpose: "maskable",
      },
    ],
    shortcuts: base.shortcuts.map((shortcut) => ({
      ...shortcut,
      icons: [{ src: icon, sizes: "192x192" }],
    })),
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    },
  });
}
