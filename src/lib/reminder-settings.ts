import { addDaysUTC, dateOnlyToUTC, formatTZ } from "@/lib/datetime";

/** Pengaturan pengiriman pengingat H-1 yang bisa diubah admin. */
export interface ReminderSettings {
  /** 0 = hari H, 1 = H-1, 2 = H-2, dst. */
  offsetDays: number;
  /** Jam kirim dalam WIB, format "HH:mm". */
  sendTime: string;
  /** Template email untuk petugas dengan tugas Imam. */
  imamTemplate: string;
  /** Template email untuk petugas dengan tugas Khatib. */
  khatibTemplate: string;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  offsetDays: 1,
  sendTime: "16:00",
  imamTemplate: `Assalamu'alaikum {nama},

Ini pengingat dari {masjid} bahwa Anda bertugas sebagai imam pada {tanggal}:
{daftar_tugas}

Mohon hadir 15 menit sebelum adzan. Jika berhalangan, mohon konfirmasi ke Pengurus DKM.

Jazakumullahu khairan.`,
  khatibTemplate: `Assalamu'alaikum {nama},

Ini pengingat dari {masjid} bahwa Anda bertugas sebagai khatib Jumat pada {tanggal}:
{daftar_tugas}

Mohon hadir 15 menit sebelum khutbah. Jika berhalangan, mohon konfirmasi ke Pengurus DKM.

Jazakumullahu khairan.`,
};

export const REMINDER_TEMPLATE_VARIABLES = [
  "{nama}",
  "{masjid}",
  "{tanggal}",
  "{tugas}",
  "{daftar_tugas}",
] as const;

function normalizeOffsetDays(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_REMINDER_SETTINGS.offsetDays;
  return Math.min(30, Math.max(0, Math.round(parsed)));
}

function normalizeSendTime(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_REMINDER_SETTINGS.sendTime;
  const time = value.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ? time
    : DEFAULT_REMINDER_SETTINGS.sendTime;
}

function normalizeTemplate(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.trim();
}

export function normalizeReminderSettings(raw: unknown): ReminderSettings {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    offsetDays: normalizeOffsetDays(data.offsetDays),
    sendTime: normalizeSendTime(data.sendTime),
    imamTemplate: normalizeTemplate(data.imamTemplate, DEFAULT_REMINDER_SETTINGS.imamTemplate),
    khatibTemplate: normalizeTemplate(
      data.khatibTemplate,
      DEFAULT_REMINDER_SETTINGS.khatibTemplate
    ),
  };
}

/**
 * Tentukan tanggal tugas yang harus diingatkan pada suatu invoke cron.
 *
 * Cron harian bisa datang sedikit sebelum/sesudah jam yang diatur admin. Jika
 * belum melewati jam kirim, ambil target hari sebelumnya supaya pengingat yang
 * jatuh tempo sebelumnya tetap terkirim pada invoke terdekat. Dedupe key
 * mencegah pengiriman ganda untuk tanggal yang sama. Untuk offset 0 (hari H),
 * mundur satu hari tidak boleh membuat target menjadi kemarin: tetap pakai 0.
 */
export function resolveReminderTargetDate(now: Date, settings: ReminderSettings): Date {
  const base = dateOnlyToUTC(formatTZ(now, "yyyy-MM-dd"));
  const nowTime = formatTZ(now, "HH:mm");
  const offset = Math.max(
    0,
    nowTime >= settings.sendTime ? settings.offsetDays : settings.offsetDays - 1
  );
  return addDaysUTC(base, offset);
}
