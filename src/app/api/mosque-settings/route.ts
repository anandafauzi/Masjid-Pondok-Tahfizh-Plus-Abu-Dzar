import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";

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

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const settings = await prisma.mosqueSettings.findFirst();
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
    const body = await request.json();

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
    if (timezone) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone });
      } catch {
        return badRequest("Zona waktu tidak valid");
      }
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

    const data = {
      mosqueName,
      address: body.address ?? undefined,
      latitude,
      longitude,
      timezone,
      mapUrl: body.mapUrl ?? undefined,
      prayerCalculationMethod: body.prayerCalculationMethod ?? undefined,
      asrMethod: body.asrMethod ?? undefined,
      prayerAdjustments,
    };

    const existing = await prisma.mosqueSettings.findFirst();
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

    return ok(settings);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menyimpan pengaturan masjid");
  }
}
