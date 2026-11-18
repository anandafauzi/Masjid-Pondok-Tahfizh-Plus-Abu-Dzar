import { prisma } from "@/lib/prisma";
import { saveDisplayThemePatch } from "@/lib/settings";
import {
  DEFAULT_REMINDER_SETTINGS,
  normalizeReminderSettings,
  type ReminderSettings,
} from "@/lib/reminder-settings";

const SETTINGS_KEY = "reminderSettings";

/** Baca pengaturan pengingat dari themeSettings (data admin, bukan data publik). */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const display = await prisma.displaySetting.findFirst({
      orderBy: { id: "asc" },
      select: { themeSettings: true },
    });
    const theme = (display?.themeSettings as Record<string, unknown> | null) ?? null;
    return normalizeReminderSettings(theme?.[SETTINGS_KEY]);
  } catch (error) {
    console.error("Gagal membaca pengaturan pengingat:", error);
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await saveDisplayThemePatch({ [SETTINGS_KEY]: settings });
}
