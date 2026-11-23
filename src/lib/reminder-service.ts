import { prisma } from "@/lib/prisma";
import { getPetugasList } from "@/lib/petugas";
import { getImamSchedulesBetween, getKhatibScheduleForDate } from "@/lib/schedule-data";
import { getMosqueSettings } from "@/lib/settings";
import {
  dateOnlyToString,
  dateOnlyToUTC,
  formatDateOnlyLong,
} from "@/lib/datetime";
import {
  buildReminderRecipients,
  findPetugasForName,
  isPlaceholderName,
  summarizeDuties,
  type DutyAssignment,
  type ReminderRecipient,
} from "@/lib/reminders";
import {
  getEmailConfig,
  sendReminderEmail,
  type EmailConfig,
} from "@/lib/email";
import {
  resolveReminderTargetDate,
  type ReminderSettings,
} from "@/lib/reminder-settings";
import { getReminderSettings } from "@/lib/reminder-settings-store";
import type { ReminderStatus } from "@prisma/client";

/**
 * Tanggal tugas yang harus diingatkan pada invoke cron ini, mengikuti offset
 * H- dan jam kirim yang diatur admin (WIB).
 */
export async function getReminderTargetDateOnly(now: Date = new Date()): Promise<Date> {
  const settings = await getReminderSettings();
  return resolveReminderTargetDate(now, settings);
}

export interface ReminderPlanRecipient extends ReminderRecipient {
  status: ReminderStatus | null;
  sentAt: string | null;
  error: string | null;
  logId: string | null;
}

export interface ReminderLogSummary {
  id: string;
  recipientName: string;
  email: string | null;
  duties: string;
  status: ReminderStatus;
  provider: string | null;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface ReminderPlan {
  date: string;
  dateLabel: string;
  isFriday: boolean;
  mosqueName: string;
  email: EmailConfig;
  settings: ReminderSettings;
  assignments: DutyAssignment[];
  unmatchedNames: string[];
  recipients: ReminderPlanRecipient[];
  logs: ReminderLogSummary[];
}

export interface ReminderSendResult {
  dedupeKey: string;
  name: string;
  email: string | null;
  status: "SENT" | "FAILED" | "SKIPPED";
  error?: string;
}

function serializeLog(log: {
  id: string;
  recipientName: string;
  email: string | null;
  duties: string;
  status: ReminderStatus;
  provider: string | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
}): ReminderLogSummary {
  return {
    id: log.id,
    recipientName: log.recipientName,
    email: log.email,
    duties: log.duties,
    status: log.status,
    provider: log.provider,
    error: log.error,
    sentAt: log.sentAt?.toISOString() ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

/**
 * Susun daftar penerima pengingat untuk satu tanggal tugas, lengkap dengan
 * status pengiriman yang sudah tercatat. Tidak mengirim pesan apa pun.
 */
export async function buildReminderPlan(dateOnly: Date): Promise<ReminderPlan> {
  const date = dateOnlyToUTC(dateOnlyToString(dateOnly));
  const ymd = dateOnlyToString(date);
  const isFriday = date.getUTCDay() === 5;

  const [imamSchedules, khatib, petugas, mosque, settings, logs] = await Promise.all([
    getImamSchedulesBetween(date, date),
    isFriday ? getKhatibScheduleForDate(date) : Promise.resolve(null),
    getPetugasList(),
    getMosqueSettings(),
    getReminderSettings(),
    prisma.reminderLog
      .findMany({ where: { reminderDate: date }, orderBy: { createdAt: "desc" } })
      .catch((error) => {
        console.error("Gagal membaca log pengingat:", error);
        return [];
      }),
  ]);

  const assignments: DutyAssignment[] = [];
  for (const item of imamSchedules) {
    if (dateOnlyToString(item.scheduleDate) !== ymd) continue;
    if (item.imamName && !isPlaceholderName(item.imamName)) {
      assignments.push({ role: "IMAM", prayerName: item.prayerName, personName: item.imamName });
    }
  }

  if (
    isFriday &&
    khatib?.khatibName &&
    !khatib.isHoliday &&
    !isPlaceholderName(khatib.khatibName)
  ) {
    assignments.push({ role: "KHATIB", prayerName: null, personName: khatib.khatibName });
  }

  const recipients = buildReminderRecipients({
    dateYmd: ymd,
    dateLabel: formatDateOnlyLong(date),
    mosqueName: mosque.mosqueName,
    assignments,
    petugas,
    settings,
  });

  const byKey = new Map(logs.map((log) => [log.dedupeKey, log]));
  const planRecipients: ReminderPlanRecipient[] = recipients.map((recipient) => {
    const log = byKey.get(recipient.dedupeKey);
    return {
      ...recipient,
      status: log?.status ?? null,
      sentAt: log?.sentAt?.toISOString() ?? null,
      error: log?.error ?? null,
      logId: log?.id ?? null,
    };
  });

  const unmatchedNames = Array.from(
    new Set(
      assignments
        .filter((assignment) => !findPetugasForName(assignment.personName, assignment.role, petugas))
        .map((assignment) => assignment.personName.trim())
    )
  );

  return {
    date: ymd,
    dateLabel: formatDateOnlyLong(date),
    isFriday,
    mosqueName: mosque.mosqueName,
    email: getEmailConfig(),
    settings,
    assignments,
    unmatchedNames,
    recipients: planRecipients,
    logs: logs.map(serializeLog),
  };
}

async function deliverRecipient(
  date: Date,
  recipient: ReminderRecipient,
  mosqueName: string,
  force = false
): Promise<ReminderSendResult> {
  const dutiesText = summarizeDuties(recipient.duties);
  const base = {
    reminderDate: date,
    dedupeKey: recipient.dedupeKey,
    recipientName: recipient.name,
    email: recipient.email,
    duties: dutiesText,
    message: recipient.message,
  };

  const skipped = () => ({
    dedupeKey: recipient.dedupeKey,
    name: recipient.name,
    email: recipient.email,
    status: "SKIPPED" as const,
    error: "Pengingat sedang diproses atau sudah pernah terkirim",
  });

  const existing = await prisma.reminderLog.findUnique({
    where: { dedupeKey: recipient.dedupeKey },
  });
  if (existing?.status === "SENT" && !force) return skipped();

  // Satu pengiriman diproses maksimal 10 menit; setelah itu dianggap gagal
  // dan boleh diambil alih (misalnya proses cron yang mati mendadak).
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000);
  const claimedAt = new Date();

  async function claim(current: typeof existing): Promise<{ id: string } | null> {
    let row = current;

    if (!row) {
      try {
        return await prisma.reminderLog.create({
          data: { ...base, status: "SENDING", claimedAt },
        });
      } catch (error) {
        if ((error as { code?: string })?.code !== "P2002") throw error;
        row = await prisma.reminderLog.findUnique({
          where: { dedupeKey: recipient.dedupeKey },
        });
      }
    }

    if (!row) return null;
    if (row.status === "SENT" && !force) return null;
    if (
      row.status === "SENDING" &&
      !force &&
      row.claimedAt &&
      row.claimedAt > staleBefore
    ) {
      return null;
    }

    const statuses: ReminderStatus[] = ["PENDING", "FAILED"];
    if (force) statuses.push("SENT", "SENDING");
    else if (row.status === "SENDING") statuses.push("SENDING");

    const claimed = await prisma.reminderLog.updateMany({
      where: {
        id: row.id,
        status: { in: statuses },
        ...(row.status === "SENDING" && !force
          ? { claimedAt: { lt: staleBefore } }
          : {}),
      },
      data: { ...base, status: "SENDING", claimedAt, error: null, sentAt: null },
    });

    return claimed.count === 1 ? { id: row.id } : null;
  }

  const log = await claim(existing);
  if (!log) return skipped();

  if (!recipient.email) {
    const message = "Email petugas belum diisi di menu Data Petugas";
    await prisma.reminderLog.update({
      where: { id: log.id },
      data: { status: "SKIPPED", claimedAt: null, error: message },
    });
    return {
      dedupeKey: recipient.dedupeKey,
      name: recipient.name,
      email: null,
      status: "SKIPPED",
      error: message,
    };
  }

  const result = await sendReminderEmail({
    to: recipient.email,
    name: recipient.name,
    mosqueName,
    duties: dutiesText,
    dateLabel: formatDateOnlyLong(date),
    text: recipient.message,
  });

  await prisma.reminderLog.update({
    where: { id: log.id },
    data: result.ok
      ? {
          status: "SENT",
          claimedAt: null,
          provider: result.provider,
          providerRef: result.reference ?? null,
          error: null,
          sentAt: new Date(),
        }
      : {
          status: "FAILED",
          claimedAt: null,
          provider: result.provider,
          error: result.error ?? "Gagal mengirim email",
        },
  });

  return {
    dedupeKey: recipient.dedupeKey,
    name: recipient.name,
    email: recipient.email,
    status: result.ok ? "SENT" : "FAILED",
    error: result.error,
  };
}

/**
 * Kirim pengingat untuk satu tanggal. `dedupeKeys` opsional untuk mengirim
 * hanya penerima tertentu. Penerima yang sudah berstatus SENT otomatis
 * dilewati sehingga aman dipanggil berulang kali (mis. cron harian).
 */
export async function sendRemindersForDate(
  dateOnly: Date,
  options: { dedupeKeys?: string[]; plan?: ReminderPlan; force?: boolean } = {}
): Promise<{ plan: ReminderPlan; results: ReminderSendResult[] }> {
  const plan = options.plan ?? (await buildReminderPlan(dateOnly));
  const wanted = options.dedupeKeys?.length
    ? new Set(options.dedupeKeys)
    : null;

  const targets = plan.recipients.filter(
    (recipient) => !wanted || wanted.has(recipient.dedupeKey)
  );

  const results: ReminderSendResult[] = [];
  for (const recipient of targets) {
    // Penerima tanpa email tidak perlu dicatat ke database: statusnya sudah
    // terlihat di pratinjau admin dan tidak ada pesan yang dikirim.
    if (!recipient.email) {
      results.push({
        dedupeKey: recipient.dedupeKey,
        name: recipient.name,
        email: null,
        status: "SKIPPED",
        error: "Email petugas belum diisi di menu Data Petugas",
      });
      continue;
    }

    results.push(
      await deliverRecipient(
        dateOnlyToUTC(plan.date),
        recipient,
        plan.mosqueName,
        options.force === true
      )
    );
  }

  return { plan, results };
}
