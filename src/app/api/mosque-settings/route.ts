import { NextRequest } from "next/server";
import { revalidateAllAppPaths } from "@/lib/revalidate";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  readJsonBody,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { TIMEZONE } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const ADJUSTMENT_KEYS = new Set([
  "imsak",
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
]);

const ALLOWED_CALCULATION_METHODS = new Set([
  "KEMENAG",
  "Kemenag",
  "Indonesia",
  "SIHAT",
  "Singapore",
  "MWL",
  "Makkah",
  "Egypt",
  "ISNA",
  "Karachi",
  "Dubai",
  "Turkey",
  "Tehran",
]);

const ALLOWED_ASR_METHODS = new Set(["STANDARD", "HANAFI"]);

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_LOGO_DATA_URL_LENGTH = 4_000_000;

function isValidLogoUrl(value: unknown): boolean {
  if (value === null || value === "") return true;
  if (typeof value !== "string") return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (value.length > MAX_LOGO_DATA_URL_LENGTH) return false;
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(value);
  return Boolean(match && ALLOWED_LOGO_MIME.has(match[1].toLowerCase()));
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const settings = await prisma.mosqueSettings.findFirst({
      orderBy: { id: "asc" },
    });
    return ok(settings);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJsonBody(request);
    if (!body) return badRequest("Format data tidak valid");

    if (body.logoUrl !== undefined && !isValidLogoUrl(body.logoUrl)) {
      return badRequest("Format logo tidak didukung. Gunakan PNG, JPEG, WebP, atau GIF");
    }

    const mosqueName =
      body.mosqueName !== undefined ? String(body.mosqueName).trim() : undefined;
    if (mosqueName !== undefined && !mosqueName) {
      return badRequest("Nama masjid wajib diisi");
    }

    const latitude =
      body.latitude !== undefined ? Number(body.latitude) : undefined;
    if (
      latitude !== undefined &&
      (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    ) {
      return badRequest("Latitude harus berada di antara -90 dan 90");
    }

    const longitude =
      body.longitude !== undefined ? Number(body.longitude) : undefined;
    if (
      longitude !== undefined &&
      (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    ) {
      return badRequest("Longitude harus berada di antara -180 dan 180");
    }

    const timezone =
      body.timezone !== undefined ? String(body.timezone).trim() : undefined;
    if (timezone !== undefined && timezone !== TIMEZONE) {
      // Perhitungan shalat, countdown, dan tampilan saat ini dipatok ke WIB.
      // Menyimpan zona lain (atau string kosong) akan menyesatkan.
      return badRequest(
        "Saat ini aplikasi hanya mendukung zona waktu Asia/Jakarta (WIB)"
      );
    }

    const prayerCalculationMethod =
      body.prayerCalculationMethod !== undefined
        ? String(body.prayerCalculationMethod).trim()
        : undefined;
    if (
      prayerCalculationMethod !== undefined &&
      !ALLOWED_CALCULATION_METHODS.has(prayerCalculationMethod)
    ) {
      return badRequest("Metode perhitungan waktu shalat tidak dikenal");
    }

    const asrMethod =
      body.asrMethod !== undefined ? String(body.asrMethod).trim() : undefined;
    if (asrMethod !== undefined && !ALLOWED_ASR_METHODS.has(asrMethod)) {
      return badRequest("Metode Asar harus STANDARD atau HANAFI");
    }

    let prayerAdjustments:
      | Record<string, number>
      | typeof Prisma.DbNull
      | undefined;
    if (body.prayerAdjustments !== undefined) {
      if (body.prayerAdjustments === null) {
        prayerAdjustments = Prisma.DbNull;
      } else if (
        typeof body.prayerAdjustments !== "object" ||
        Array.isArray(body.prayerAdjustments)
      ) {
        return badRequest("Koreksi waktu shalat tidak valid");
      } else {
        const sanitized: Record<string, number> = {};
        for (const [key, raw] of Object.entries(body.prayerAdjustments)) {
          if (!ADJUSTMENT_KEYS.has(key)) continue;
          const minutes = Number(raw);
          if (!Number.isFinite(minutes)) {
            return badRequest(`Koreksi waktu ${key} harus berupa angka`);
          }
          sanitized[key] = Math.min(Math.max(Math.trunc(minutes), -60), 60);
        }
        prayerAdjustments = sanitized;
      }
    }

    const logoUrl =
      body.logoUrl !== undefined
        ? body.logoUrl === "" || body.logoUrl === null
          ? null
          : String(body.logoUrl)
        : undefined;

    const data = {
      mosqueName,
      logoUrl,
      address: body.address ?? undefined,
      latitude,
      longitude,
      timezone,
      mapUrl: body.mapUrl ?? undefined,
      prayerCalculationMethod,
      asrMethod,
      prayerAdjustments,
    };

    const existing = await prisma.mosqueSettings.findFirst({
      orderBy: { id: "asc" },
    });
    const settings = existing
      ? await prisma.mosqueSettings.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.mosqueSettings.create({
          data: { id: "default", ...data },
        });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_MOSQUE_SETTINGS",
      entityType: "MosqueSettings",
      entityId: settings.id,
      changeSummary: "Memperbarui pengaturan masjid",
    });

    revalidateAllAppPaths();

    return ok(settings);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menyimpan pengaturan masjid");
  }
}
