import { prisma } from "@/lib/prisma";
import { dateOnlyToString, addDaysUTC } from "@/lib/datetime";
import { getWeeklyImamSettings, PRAYERS } from "@/lib/weekly-imam";

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

export async function getImamSchedulesBetween(from: Date, to: Date) {
  try {
    const [dbSchedules, weeklyRules] = await Promise.all([
      prisma.imamMuadzinSchedule.findMany({
        where: { scheduleDate: { gte: from, lte: to } },
        orderBy: [{ scheduleDate: "asc" }, { prayerName: "asc" }],
      }),
      getWeeklyImamSettings().catch(() => []),
    ]);

    // Map existing records by `YYYY-MM-DD_PrayerName`
    const existingMap = new Map<string, (typeof dbSchedules)[number]>();
    for (const item of dbSchedules) {
      const key = `${dateOnlyToString(item.scheduleDate)}_${item.prayerName}`;
      existingMap.set(key, item);
    }

    const merged = [...dbSchedules];
    const fromTime = from.getTime();
    const toTime = to.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const daysDiff = Math.round((toTime - fromTime) / oneDayMs);

    // If weekly rules exist, synthesize missing prayers for each day
    if (weeklyRules.length > 0) {
      for (let i = 0; i <= daysDiff; i++) {
        const currentDate = addDaysUTC(from, i);
        const dayOfWeek = currentDate.getUTCDay();
        const ymd = dateOnlyToString(currentDate);

        for (const prayer of PRAYERS) {
          const key = `${ymd}_${prayer}`;
          if (!existingMap.has(key)) {
            const rule = weeklyRules.find(
              (r) =>
                r.dayOfWeek === dayOfWeek &&
                r.prayerName.toLowerCase() === prayer.toLowerCase() &&
                r.isActive &&
                Boolean(r.imamName)
            );

            if (rule) {
              // Check validity (Tetap Selamanya or within date range)
              if (rule.effectiveFrom && ymd < rule.effectiveFrom) continue;
              if (
                !rule.isPermanent &&
                rule.effectiveUntil &&
                ymd > rule.effectiveUntil
              ) {
                continue;
              }

              merged.push({
                id: `weekly-${dayOfWeek}-${prayer}-${ymd}`,
                scheduleDate: currentDate,
                prayerName: prayer,
                imamName: rule.imamName,
                muadzinName: rule.muadzinName,
                recurrenceRuleId: "weekly-rule",
                notes: rule.notes ?? null,
                createdBy: "weekly-recurring",
                updatedAt: new Date(),
              });
            }
          }
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
    return await prisma.kajianSchedule.findMany({
      where: { startDateTime: { gte: from }, isActive: true },
      orderBy: { startDateTime: "asc" },
      take,
    });
  } catch {
    return [];
  }
}

export const getKajianSafe = getUpcomingKajian;

export async function getKhatibScheduleForDate(fridayDate: Date) {
  try {
    return await prisma.khatibSchedule.findFirst({ where: { fridayDate } });
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

/** Next Friday (today if it is Friday), as a @db.Date UTC-midnight value. */
export function nextFriday(dateOnly: Date): Date {
  const d = new Date(dateOnly);
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (5 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
