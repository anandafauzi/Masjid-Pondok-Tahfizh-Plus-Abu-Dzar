import { prisma } from "@/lib/prisma";
import { addDaysUTC } from "@/lib/datetime";
import { Prisma } from "@prisma/client";
import {
  DAYS_OF_WEEK,
  PRAYERS,
  WeeklyImamItem,
} from "@/types/weekly-imam";

export { DAYS_OF_WEEK, PRAYERS, type WeeklyImamItem };

/**
 * Returns empty weekly schedule by default.
 * No dummy/sample names injected.
 */
export function getDefaultWeeklySchedule(): WeeklyImamItem[] {
  return [];
}

/**
 * Load weekly imam schedule from display settings themeSettings JSON.
 */
export async function getWeeklyImamSettings(): Promise<WeeklyImamItem[]> {
  try {
    const display = await prisma.displaySetting.findFirst({
      select: { themeSettings: true },
    });

    const theme = (display?.themeSettings as Record<string, unknown>) ?? null;
    if (theme && Array.isArray(theme.weeklyImam) && theme.weeklyImam.length > 0) {
      return theme.weeklyImam as WeeklyImamItem[];
    }

    return [];
  } catch (error) {
    console.error("Gagal membaca weekly imam settings:", error);
    return [];
  }
}

/**
 * Save weekly imam schedule to display settings themeSettings JSON,
 * and optionally sync rows to the database calendar.
 */
export async function saveWeeklyImamSettings(
  items: WeeklyImamItem[],
  syncDays = 14
): Promise<void> {
  const display = await prisma.displaySetting.findFirst({
    select: { id: true, themeSettings: true },
  });

  const existingTheme =
    (display?.themeSettings as Record<string, unknown>) ?? {};
  const newTheme = {
    ...existingTheme,
    weeklyImam: items,
  };

  if (display) {
    await prisma.displaySetting.update({
      where: { id: display.id },
      data: { themeSettings: newTheme as unknown as Prisma.InputJsonValue },
    });
  }

  if (syncDays > 0) {
    await syncWeeklyToCalendar(items, syncDays);
  }
}

/**
 * Synchronize weekly schedule entries into `ImamMuadzinSchedule`
 * for the next N days. Only creates entries where there isn't an existing entry.
 */
export async function syncWeeklyToCalendar(
  weeklyItems: WeeklyImamItem[],
  daysCount = 14
): Promise<number> {
  if (!weeklyItems || weeklyItems.length === 0) return 0;

  // Filter out items without an imamName
  const activeRules = weeklyItems.filter(
    (item) => item.isActive && item.imamName && item.imamName.trim() !== ""
  );
  if (activeRules.length === 0) return 0;

  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  );
  const endUTC = addDaysUTC(todayUTC, daysCount);

  // Fetch all existing entries in this window in one single query
  const existingEntries = await prisma.imamMuadzinSchedule.findMany({
    where: {
      scheduleDate: {
        gte: todayUTC,
        lte: endUTC,
      },
    },
    select: {
      scheduleDate: true,
      prayerName: true,
    },
  });

  // Build a lookup set for fast O(1) checks
  const existingSet = new Set(
    existingEntries.map(
      (e) => `${e.scheduleDate.toISOString().slice(0, 10)}_${e.prayerName}`
    )
  );

  const entriesToCreate: Array<{
    scheduleDate: Date;
    prayerName: string;
    imamName: string;
    muadzinName: string;
    notes: string | null;
    createdBy: string;
  }> = [];

  for (let d = 0; d < daysCount; d++) {
    const targetDate = addDaysUTC(todayUTC, d);
    const dayOfWeek = targetDate.getUTCDay();
    const dateStr = targetDate.toISOString().slice(0, 10);

    const matchingRules = activeRules.filter((r) => r.dayOfWeek === dayOfWeek);

    for (const rule of matchingRules) {
      if (rule.effectiveFrom && dateStr < rule.effectiveFrom) continue;
      if (
        !rule.isPermanent &&
        rule.effectiveUntil &&
        dateStr > rule.effectiveUntil
      ) {
        continue;
      }

      const lookupKey = `${dateStr}_${rule.prayerName}`;
      if (!existingSet.has(lookupKey)) {
        entriesToCreate.push({
          scheduleDate: targetDate,
          prayerName: rule.prayerName,
          imamName: rule.imamName.trim(),
          muadzinName: rule.muadzinName ? rule.muadzinName.trim() : "",
          notes: rule.notes || null,
          createdBy: "weekly-sync",
        });
        existingSet.add(lookupKey);
      }
    }
  }

  if (entriesToCreate.length === 0) return 0;

  // Insert in batches of 50 to prevent timeouts
  const BATCH_SIZE = 50;
  for (let i = 0; i < entriesToCreate.length; i += BATCH_SIZE) {
    const batch = entriesToCreate.slice(i, i + BATCH_SIZE);
    await prisma.imamMuadzinSchedule.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }

  return entriesToCreate.length;
}
