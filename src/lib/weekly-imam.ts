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
 * Default starter weekly schedule (matches the mosque's real data:
 * Subuh: Ust. Abdullah Mundzir / Fatih/Hiraki
 * Zuhur: Asatidz/Musyrif / Fauzan/Fadgham
 * Asar: Asatidz/Musyrif / Albar/Muhammad
 * Magrib: Satria Rupawan / Baraka/Satria
 * Isya: Albar Abdul Malik / Fadgham/Taqiyuddin
 */
export function getDefaultWeeklySchedule(): WeeklyImamItem[] {
  const items: WeeklyImamItem[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);

  const defaultPrayers = [
    { prayer: "Subuh", imam: "Ust. Abdullah Mundzir", muadzin: "Fatih / Hiraki" },
    { prayer: "Zuhur", imam: "Asatidz / Musyrif", muadzin: "Fauzan / Fadgham" },
    { prayer: "Asar", imam: "Asatidz / Musyrif", muadzin: "Albar / Muhammad" },
    { prayer: "Magrib", imam: "Satria Rupawan", muadzin: "Baraka / Satria" },
    { prayer: "Isya", imam: "Albar Abdul Malik", muadzin: "Fadgham / Taqiyuddin" },
  ];

  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    for (const p of defaultPrayers) {
      items.push({
        id: `weekly-${day}-${p.prayer}`,
        dayOfWeek: day,
        prayerName: p.prayer,
        imamName: p.imam,
        muadzinName: p.muadzin,
        isPermanent: true, // Default "Tetap Selamanya"
        effectiveFrom: todayStr,
        effectiveUntil: null,
        notes: null,
        isActive: true,
      });
    }
  }

  return items;
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

    return getDefaultWeeklySchedule();
  } catch (error) {
    console.error("Gagal membaca weekly imam settings:", error);
    return getDefaultWeeklySchedule();
  }
}

/**
 * Save weekly imam schedule to display settings themeSettings JSON,
 * and optionally sync rows to the database calendar.
 */
export async function saveWeeklyImamSettings(
  items: WeeklyImamItem[],
  syncDays = 60
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
  daysCount = 60
): Promise<number> {
  if (!weeklyItems || weeklyItems.length === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const activeRules = weeklyItems.filter((w) => w.isActive && w.imamName && w.muadzinName);
  let upsertedCount = 0;

  for (let i = 0; i < daysCount; i++) {
    const targetDate = addDaysUTC(today, i);
    const dayOfWeek = targetDate.getUTCDay();
    const dateStr = targetDate.toISOString().slice(0, 10);

    const rulesForDay = activeRules.filter((r) => r.dayOfWeek === dayOfWeek);

    for (const rule of rulesForDay) {
      // Check date validity
      if (rule.effectiveFrom && dateStr < rule.effectiveFrom) continue;
      if (!rule.isPermanent && rule.effectiveUntil && dateStr > rule.effectiveUntil) continue;

      try {
        await prisma.imamMuadzinSchedule.upsert({
          where: {
            scheduleDate_prayerName: {
              scheduleDate: targetDate,
              prayerName: rule.prayerName,
            },
          },
          update: {
            // Update only if it was originally created by weekly recurrence
            // Don't overwrite if manual override was set by admin
          },
          create: {
            scheduleDate: targetDate,
            prayerName: rule.prayerName,
            imamName: rule.imamName,
            muadzinName: rule.muadzinName,
            recurrenceRuleId: "weekly-rule",
            notes: rule.notes ?? null,
            createdBy: "weekly-sync",
          },
        });
        upsertedCount++;
      } catch {
        // ignore unique constraint collisions or concurrent updates
      }
    }
  }

  return upsertedCount;
}
