import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, ok, serverError, unauthorized, badRequest } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";
import { getMosqueSettings } from "@/lib/settings";
import { calculatePrayerTimes } from "@/lib/prayer-times";
import { todayDateOnly } from "@/lib/datetime";
import { isIqamahAfterAdhan } from "@/lib/iqamah";
import { normalizePrayerName } from "@/utils/constants";

export const dynamic = "force-dynamic";

const PRAYER_NAMES = new Set(["Shubuh", "Dzuhur", "Ashar", "Maghrib", "Isya"]);
const ADHAN_KEY: Record<string, "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"> = {
  Shubuh: "fajr",
  Dzuhur: "dhuhr",
  Ashar: "asr",
  Maghrib: "maghrib",
  Isya: "isha",
};

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const settings = await prisma.iqamahSetting.findMany({
      orderBy: { prayerName: "asc" },
    });
    // Tampilkan label kanonik walau database masih berisi ejaan lama.
    const seen = new Set<string>();
    const normalized = [];
    for (const setting of settings) {
      const prayerName = normalizePrayerName(setting.prayerName);
      if (!PRAYER_NAMES.has(prayerName) || seen.has(prayerName)) continue;
      seen.add(prayerName);
      normalized.push({ ...setting, prayerName });
    }
    return ok(normalized);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Format data tidak valid");
    }
    const items = Array.isArray(body)
      ? body
      : body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)
        ? (body as { items: unknown[] }).items
        : null;
    if (!items) return badRequest("Format data tidak valid");

    const mosque = await getMosqueSettings();
    const adhanTimes = calculatePrayerTimes(todayDateOnly(), {
      method: mosque.prayerCalculationMethod,
      asrMethod: mosque.asrMethod,
      adjustments: mosque.prayerAdjustments,
      latitude: mosque.latitude,
      longitude: mosque.longitude,
    });

    const validated: Array<{
      prayerName: string;
      mode: "FIXED_TIME" | "DELAY_MINUTES";
      delayMinutes: number;
      fixedIqamahTime: string | null;
    }> = [];
    for (const item of items) {
      // Terima ejaan lama dari klien/DB, tapi simpan label kanonik baru.
      const prayerName = normalizePrayerName(
        item?.prayerName ? String(item.prayerName) : ""
      );
      if (!PRAYER_NAMES.has(prayerName)) {
        return badRequest(`Nama shalat tidak valid: ${prayerName || "(kosong)"}`);
      }

      const mode = item.mode === "FIXED_TIME" ? "FIXED_TIME" : "DELAY_MINUTES";
      const rawDelay = Number(item.delayMinutes ?? 0);
      const delayMinutes = Number.isFinite(rawDelay)
        ? Math.min(Math.max(Math.trunc(rawDelay), 0), 120)
        : 15;

      let fixedIqamahTime: string | null = null;
      if (mode === "FIXED_TIME") {
        const fixed = item.fixedIqamahTime
          ? String(item.fixedIqamahTime)
          : "";
        if (!isValidTime(fixed)) {
          return badRequest(
            `Waktu iqamah tetap untuk ${prayerName} tidak valid (format HH:mm)`
          );
        }
        const adhanTime = adhanTimes[ADHAN_KEY[prayerName]];
        if (!isIqamahAfterAdhan(adhanTime, fixed)) {
          return badRequest(
            `Waktu iqamah ${prayerName} (${fixed}) harus setelah adzan (${adhanTime})`
          );
        }
        fixedIqamahTime = fixed;
      }

      validated.push({ prayerName, mode, delayMinutes, fixedIqamahTime });
    }

    // Validasi selesai untuk semua item sebelum menulis. Transaksi memastikan
    // tidak ada sebagian jadwal yang tersimpan ketika salah satu item gagal.
    const results = await prisma.$transaction(
      validated.map((item) =>
        prisma.iqamahSetting.upsert({
          where: { prayerName: item.prayerName },
          update: {
            mode: item.mode,
            delayMinutes: item.delayMinutes,
            fixedIqamahTime: item.fixedIqamahTime,
          },
          create: item,
        })
      )
    );

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_IQAMAH_SETTINGS",
      entityType: "IqamahSetting",
      changeSummary: "Memperbarui pengaturan iqamah",
    });

    revalidateAllAppPaths();

    return ok(results);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menyimpan pengaturan iqamah");
  }
}
