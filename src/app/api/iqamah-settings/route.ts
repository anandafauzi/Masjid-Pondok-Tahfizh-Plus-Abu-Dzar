import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, ok, serverError, unauthorized, badRequest } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const PRAYER_NAMES = new Set(["Subuh", "Zuhur", "Asar", "Magrib", "Isya"]);

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
    const items = Array.isArray(body) ? body : body.items;
    if (!Array.isArray(items)) return badRequest("Format data tidak valid");

    const results = [];
    for (const item of items) {
      const prayerName = item?.prayerName ? String(item.prayerName) : "";
      if (!PRAYER_NAMES.has(prayerName)) continue;

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
        fixedIqamahTime = fixed;
      }

      const saved = await prisma.iqamahSetting.upsert({
        where: { prayerName },
        update: { mode, delayMinutes, fixedIqamahTime },
        create: {
          prayerName,
          mode,
          delayMinutes,
          fixedIqamahTime,
        },
      });
      results.push(saved);
    }

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_IQAMAH_SETTINGS",
      entityType: "IqamahSetting",
      changeSummary: "Memperbarui pengaturan iqamah",
    });

    return ok(results);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menyimpan pengaturan iqamah");
  }
}
