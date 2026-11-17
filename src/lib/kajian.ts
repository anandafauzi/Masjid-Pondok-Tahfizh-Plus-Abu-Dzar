import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TIMEZONE, dateOnlyToString } from "@/lib/datetime";

/** Baris kajian dari database yang dibutuhkan untuk menyusun jadwal. */
export interface KajianRowLike {
  id: string;
  title: string;
  speakerName: string;
  bookOrTopic: string | null;
  startDateTime: Date;
  endDateTime: Date | null;
  location: string;
  description: string | null;
  isActive: boolean;
  isRecurring: boolean;
  recurrenceDay: number | null;
  recurrenceUntil: Date | null;
  rescheduledFrom: Date | null;
}

export interface KajianExceptionLike {
  kajianId: string;
  occurrenceDate: Date;
  newStartDateTime: Date | null;
  newEndDateTime: Date | null;
  note?: string | null;
}

export interface KajianOccurrence extends Omit<KajianRowLike, "rescheduledFrom"> {
  /** ID publik yang stabil: `templateId@YYYY-MM-DD` untuk jadwal berulang. */
  id: string;
  kajianId: string;
  occurrenceDate: string;
  isException: boolean;
  originalStartDateTime: Date | null;
  rescheduledFrom: Date | null;
  exceptionNote: string | null;
}

export const WEEKDAY_LABELS = [
  "Ahad",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

/** yyyy-MM-dd menurut kalender WIB. */
export function ymdWib(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

/** 0 = Ahad ... 6 = Sabtu menurut kalender WIB. */
export function weekdayWib(date: Date): number {
  return Number(formatInTimeZone(date, TIMEZONE, "i")) % 7;
}

export function weekdayLabel(day: number | null | undefined): string {
  if (day === null || day === undefined || day < 0 || day > 6) return "-";
  return WEEKDAY_LABELS[day];
}

/**
 * Tambah beberapa pekan tanpa mengubah jam dinding WIB (aman dari pergeseran
 * zona waktu karena tanggal dan jam dibentuk ulang di Asia/Jakarta).
 */
export function addWeeksWib(date: Date, weeks: number): Date {
  const ymd = ymdWib(date);
  const hhmm = formatInTimeZone(date, TIMEZONE, "HH:mm");
  const calendar = new Date(`${ymd}T00:00:00.000Z`);
  calendar.setUTCDate(calendar.getUTCDate() + weeks * 7);
  return fromZonedTime(`${calendar.toISOString().slice(0, 10)}T${hhmm}:00`, TIMEZONE);
}

function exceptionKey(kajianId: string, occurrenceYmd: string): string {
  return `${kajianId}@${occurrenceYmd}`;
}

function shiftByDuration(start: Date, end: Date | null, nextStart: Date): Date | null {
  if (!end) return null;
  return new Date(nextStart.getTime() + (end.getTime() - start.getTime()));
}

function toOccurrence(
  row: KajianRowLike,
  originalStart: Date,
  start: Date,
  end: Date | null,
  isException: boolean,
  note: string | null
): KajianOccurrence {
  const occurrenceDate = ymdWib(originalStart);
  return {
    ...row,
    id: `${row.id}@${occurrenceDate}`,
    kajianId: row.id,
    occurrenceDate,
    startDateTime: start,
    endDateTime: end,
    isException,
    originalStartDateTime: isException ? originalStart : null,
    rescheduledFrom: null,
    exceptionNote: note,
  };
}

/**
 * Hasilkan pertemuan-pertemuan dari satu jadwal berulang.
 *
 * - Jam dinding WIB dipertahankan setiap pekan.
 * - `recurrenceUntil` (tanggal) menjadi batas akhir.
 * - Exception (reschedule satu pertemuan) mengganti tanggal/jam pertemuan itu
 *   tanpa mengubah pekan lainnya.
 */
export function generateKajianOccurrences(
  row: KajianRowLike,
  exceptions: KajianExceptionLike[],
  from: Date,
  options: { horizonDays?: number; maxOccurrences?: number } = {}
): KajianOccurrence[] {
  if (!row.isRecurring) {
    return row.startDateTime.getTime() >= from.getTime()
      ? [
          {
            ...row,
            id: row.id,
            kajianId: row.id,
            occurrenceDate: ymdWib(row.startDateTime),
            isException: Boolean(row.rescheduledFrom),
            originalStartDateTime: row.rescheduledFrom,
            rescheduledFrom: row.rescheduledFrom,
            exceptionNote: null,
          },
        ]
      : [];
  }

  const horizonDays = options.horizonDays ?? 365;
  const maxOccurrences = options.maxOccurrences ?? 60;
  const horizon = new Date(from.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const untilYmd = row.recurrenceUntil ? dateOnlyToString(row.recurrenceUntil) : null;

  const exceptionMap = new Map<string, KajianExceptionLike>();
  for (const exception of exceptions) {
    if (exception.kajianId !== row.id) continue;
    exceptionMap.set(
      exceptionKey(row.id, dateOnlyToString(exception.occurrenceDate)),
      exception
    );
  }

  // Lompat langsung ke pekan yang relevan agar jadwal lama tidak diiterasi
  // satu per satu dari tanggal pertama.
  let occurrence = row.startDateTime;
  if (occurrence.getTime() < from.getTime()) {
    const weeksSinceStart = Math.floor(
      (from.getTime() - occurrence.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    occurrence = addWeeksWib(occurrence, Math.max(0, weeksSinceStart - 1));
  }

  const results: KajianOccurrence[] = [];
  let guard = 0;

  while (guard < 120 && results.length < maxOccurrences) {
    guard += 1;

    if (occurrence.getTime() > horizon.getTime()) break;
    const occurrenceYmd = ymdWib(occurrence);

    if (untilYmd && occurrenceYmd > untilYmd) break;

    const exception = exceptionMap.get(exceptionKey(row.id, occurrenceYmd));
    const movedStart = exception?.newStartDateTime ?? null;
    const effectiveStart = movedStart ?? occurrence;
    const effectiveEnd = movedStart
      ? (exception?.newEndDateTime ?? shiftByDuration(row.startDateTime, row.endDateTime, movedStart))
      : shiftByDuration(row.startDateTime, row.endDateTime, occurrence);

    if (effectiveStart.getTime() >= from.getTime()) {
      results.push(
        toOccurrence(
          row,
          occurrence,
          effectiveStart,
          effectiveEnd,
          Boolean(movedStart),
          exception?.note ?? null
        )
      );
    }

    occurrence = addWeeksWib(occurrence, 1);
  }

  return results;
}

/**
 * Gabungkan kajian sekali-sekali dan pertemuan dari jadwal berulang menjadi
 * satu daftar terurut. Dipakai halaman publik, TV, dan panel admin.
 */
export function buildKajianOccurrences({
  rows,
  exceptions,
  from,
  take = 30,
  horizonDays,
  maxPerSeries,
}: {
  rows: KajianRowLike[];
  exceptions: KajianExceptionLike[];
  from: Date;
  take?: number;
  horizonDays?: number;
  maxPerSeries?: number;
}): KajianOccurrence[] {
  const items: KajianOccurrence[] = [];

  for (const row of rows) {
    if (!row.isActive) continue;
    items.push(
      ...generateKajianOccurrences(row, exceptions, from, {
        horizonDays,
        maxOccurrences: maxPerSeries,
      })
    );
  }

  return items
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime())
    .slice(0, take);
}
