import { prisma } from "@/lib/prisma";
import { dateOnlyToString, addDaysUTC, nextFriday } from "@/lib/datetime";
import { getWeeklyImamSettings, PRAYERS } from "@/lib/weekly-imam";
import type { WeeklyImamItem } from "@/types/weekly-imam";
import { resolveRolling } from "@/lib/rolling";
import {
  buildKajianOccurrences,
  generateKajianOccurrences,
} from "@/lib/kajian";

export async function getRunningTextsSafe() {
  try {
    return await prisma.runningText.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getAdviceSafe() {
  try {
    return await prisma.islamicAdvice.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  } catch {
    return [];
  }
}

const PRAYER_ORDER: Record<string, number> = {
  Subuh: 1,
  Zuhur: 2,
  Asar: 3,
  Magrib: 4,
  Isya: 5,
};

export async function getImamSchedulesBetween(
  from: Date,
  to: Date,
  preloaded?: {
    weeklyRules?: WeeklyImamItem[];
    rollingImams?: Awaited<ReturnType<typeof getImamRollingActive>>;
  }
) {
  try {
    // Setiap query ditangani terpisah: bila tabel jadwal gagal dibaca, aturan
    // mingguan masih bisa dipakai untuk menyusun jadwal (dan sebaliknya).
    const [dbSchedules, weeklyRules, rollingImams] = await Promise.all([
      prisma.imamMuadzinSchedule
        .findMany({
          where: { scheduleDate: { gte: from, lte: to } },
          orderBy: [{ scheduleDate: "asc" }, { prayerName: "asc" }],
        })
        .catch((error) => {
          console.error("Gagal membaca jadwal imam dari database:", error);
          return [];
        }),
      preloaded?.weeklyRules
        ? Promise.resolve(preloaded.weeklyRules)
        : getWeeklyImamSettings().catch(() => []),
      preloaded?.rollingImams
        ? Promise.resolve(preloaded.rollingImams)
        : getImamRollingActive().catch(() => []),
    ]);

    // Map existing records by `YYYY-MM-DD_prayerName` (case-insensitive)
    const existingMap = new Map<string, (typeof dbSchedules)[number]>();
    for (const item of dbSchedules) {
      const key = `${dateOnlyToString(item.scheduleDate)}_${item.prayerName.toLowerCase().trim()}`;
      existingMap.set(key, item);
    }

    const merged = [...dbSchedules];
    const fromTime = from.getTime();
    const toTime = to.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const daysDiff = Math.round((toTime - fromTime) / oneDayMs);

    for (let i = 0; i <= daysDiff; i++) {
      const currentDate = addDaysUTC(from, i);
      const dayOfWeek = currentDate.getUTCDay(); // 0 = Ahad, 5 = Jumat
      const ymd = dateOnlyToString(currentDate);

      // Automatic Friday Subuh Rolling Check
      let fridaySubuhRollingName: string | null = null;
      if (dayOfWeek === 5 && rollingImams.length > 0) {
        const resolved = resolveRolling(
          rollingImams.map((r) => ({
            id: r.id,
            imamName: r.imamName,
            sequenceNumber: r.sequenceNumber,
            effectiveFrom: r.effectiveFrom,
            effectiveUntil: r.effectiveUntil,
            isActive: r.isActive,
            createdAt: r.createdAt,
          })),
          currentDate
        );
        if (resolved) {
          fridaySubuhRollingName = resolved.name;
        }
      }

      for (const prayer of PRAYERS) {
        const key = `${ymd}_${prayer.toLowerCase().trim()}`;
        const isFridaySubuh = dayOfWeek === 5 && prayer.toLowerCase() === "subuh";

        if (existingMap.has(key)) {
          // If Friday Subuh exists in DB from recurring synchronization, but there is an active rolling sequence,
          // ensure it reflects the rolling sequence unless it is an explicit manual override with custom notes.
          if (isFridaySubuh && fridaySubuhRollingName) {
            const existing = existingMap.get(key);
            if (existing && (!existing.notes || existing.notes.includes("weekly") || existing.notes.includes("Rotasi"))) {
              const idx = merged.findIndex((m) => m.id === existing.id);
              if (idx !== -1) {
                merged[idx] = {
                  ...merged[idx],
                  imamName: fridaySubuhRollingName,
                  notes: "Rotasi Subuh Jumat",
                };
              }
            }
          }
          continue;
        }

        // Synthesize missing prayers from weekly rules or Friday rolling
        const rawRule = weeklyRules.find(
          (r) =>
            r.dayOfWeek === dayOfWeek &&
            r.prayerName.toLowerCase() === prayer.toLowerCase() &&
            r.isActive &&
            r.imamName &&
            r.imamName.trim() !== ""
        );

        const isRuleValid = rawRule
          ? (!rawRule.effectiveFrom || ymd >= rawRule.effectiveFrom) &&
            (rawRule.isPermanent || !rawRule.effectiveUntil || ymd <= rawRule.effectiveUntil)
          : false;

        const rule = isRuleValid ? rawRule : undefined;

        // For Friday Subuh, if rolling imam exists, it takes precedence over static weekly rule
        const imamName = isFridaySubuh && fridaySubuhRollingName
          ? fridaySubuhRollingName
          : rule?.imamName?.trim() || "";

        const muadzinName = rule?.muadzinName || "";

        if (imamName) {
          merged.push({
            id: `weekly-${dayOfWeek}-${prayer}-${ymd}`,
            scheduleDate: currentDate,
            prayerName: prayer,
            imamName,
            muadzinName,
            recurrenceRuleId: isFridaySubuh && fridaySubuhRollingName ? "friday-rolling" : "weekly-rule",
            notes: isFridaySubuh && fridaySubuhRollingName ? "Rotasi Subuh Jumat" : rule?.notes ?? null,
            createdBy: "weekly-recurring",
            updatedAt: new Date(),
          });
        }
      }
    }

    // Sort by date ascending, then prayer sequence
    return merged.sort((a, b) => {
      const dateA = a.scheduleDate.getTime();
      const dateB = b.scheduleDate.getTime();
      if (dateA !== dateB) return dateA - dateB;
      const pA = PRAYER_ORDER[a.prayerName] ?? 99;
      const pB = PRAYER_ORDER[b.prayerName] ?? 99;
      return pA - pB;
    });
  } catch (error) {
    console.error("Gagal mengambil jadwal imam:", error);
    return [];
  }
}

export async function getUpcomingKhatibSchedules(from: Date, take = 4) {
  try {
    return await prisma.khatibSchedule.findMany({
      where: { fridayDate: { gte: from } },
      orderBy: { fridayDate: "asc" },
      take,
    });
  } catch {
    return [];
  }
}

export async function getUpcomingKajian(from: Date, take = 6) {
  try {
    const [rows, exceptions] = await Promise.all([
      prisma.kajianSchedule.findMany({
        where: { isActive: true },
        orderBy: { startDateTime: "asc" },
      }),
      prisma.kajianException.findMany().catch((error) => {
        console.error("Gagal membaca pengecualian kajian:", error);
        return [];
      }),
    ]);

    return buildKajianOccurrences({
      rows,
      exceptions,
      from,
      take,
      horizonDays: 400,
      maxPerSeries: 60,
    });
  } catch {
    return [];
  }
}

export const getKajianSafe = getUpcomingKajian;

/**
 * Data untuk panel admin: seluruh baris kajian (termasuk template jadwal
 * tetap) beserta pertemuan mendatang agar bisa di-reschedule satu per satu.
 */
export async function getAdminKajianData() {
  const [rows, exceptions] = await Promise.all([
    prisma.kajianSchedule.findMany({ orderBy: { startDateTime: "asc" } }),
    prisma.kajianException.findMany({ orderBy: { occurrenceDate: "asc" } }),
  ]);

  const now = new Date();
  const occurrences = rows
    .filter((row) => row.isRecurring)
    .flatMap((row) =>
      generateKajianOccurrences(row, exceptions, now, {
        horizonDays: 120,
        maxOccurrences: 10,
      })
    )
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  return { items: rows, occurrences };
}

export async function getKhatibScheduleForDate(
  fridayDate: Date,
  preloadedRolling?: Awaited<ReturnType<typeof getKhatibRollingActive>>
) {
  try {
    const manual = await prisma.khatibSchedule.findFirst({ where: { fridayDate } });
    if (manual) {
      return {
        ...manual,
        isRolling: false,
        sequenceNumber: undefined as number | undefined,
        totalRolling: undefined as number | undefined,
      };
    }

    const rolling = preloadedRolling ?? (await getKhatibRollingActive());
    if (rolling.length > 0) {
      const resolved = resolveRolling(
        rolling.map((r) => ({
          id: r.id,
          khatibName: r.khatibName,
          sequenceNumber: r.sequenceNumber,
          effectiveFrom: r.effectiveFrom,
          effectiveUntil: r.effectiveUntil,
          isActive: r.isActive,
          createdAt: r.createdAt,
        })),
        fridayDate
      );

      if (resolved && resolved.name) {
        return {
          id: `rolling-${dateOnlyToString(fridayDate)}`,
          fridayDate,
          khatibName: resolved.name,
          sermonTopic: null,
          backupKhatibName: null,
          recurrenceRuleId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isRolling: true,
          sequenceNumber: resolved.index + 1,
          totalRolling: resolved.total,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function getImamRollingActive() {
  try {
    return await prisma.imamRollingSetting.findMany({
      where: { isActive: true },
      orderBy: [{ sequenceNumber: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getKhatibRollingActive() {
  try {
    return await prisma.khatibRollingSetting.findMany({
      where: { isActive: true },
      orderBy: [{ sequenceNumber: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  } catch {
    return [];
  }
}

export { nextFriday };
