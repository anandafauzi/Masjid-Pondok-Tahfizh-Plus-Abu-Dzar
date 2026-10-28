import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const TIMEZONE = "Asia/Jakarta";

/** Format a Date into the mosque timezone (WIB). */
export function formatTZ(
  date: Date,
  pattern: string,
  options?: { locale?: typeof localeId }
) {
  return formatInTimeZone(date, TIMEZONE, pattern, options as never);
}

/** Current wall-clock time in WIB, represented as a Date (shifted). */
export function nowInTZ() {
  return toZonedTime(new Date(), TIMEZONE);
}

/** yyyy-MM-dd for the given instant in WIB. */
export function toDateOnlyString(date: Date = new Date()) {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

/**
 * Convert a yyyy-MM-dd string into a Date suitable for Prisma @db.Date
 * (anchored at UTC midnight so no timezone shift can change the calendar day).
 */
export function dateOnlyToUTC(value: Date | string): Date {
  const ymd =
    typeof value === "string" ? value : formatInTimeZone(value, TIMEZONE, "yyyy-MM-dd");
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Today's calendar date anchored at UTC midnight. */
export function todayDateOnly(): Date {
  return dateOnlyToUTC(toDateOnlyString(new Date()));
}

/** yyyy-MM-dd string from a @db.Date value (which is stored at UTC midnight). */
export function dateOnlyToString(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd");
}

/** Build an absolute Date from a @db.Date value + "HH:mm" wall time in WIB. */
export function combineDateTime(dateOnly: Date, hhmm: string): Date {
  const ymd = dateOnlyToString(dateOnly);
  return fromZonedTime(`${ymd}T${hhmm}:00`, TIMEZONE);
}

/** Human readable Indonesian date for a @db.Date value. */
export function formatDateOnlyLong(date: Date): string {
  return format(new Date(dateOnlyToString(date) + "T00:00:00"), "EEEE, dd MMMM yyyy", {
    locale: localeId,
  });
}

export function formatDateOnlyShort(date: Date): string {
  return format(new Date(dateOnlyToString(date) + "T00:00:00"), "dd MMM yyyy", {
    locale: localeId,
  });
}

/** Add days to a date (returns a new Date). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Add days to a @db.Date value using UTC arithmetic (calendar-safe). */
export function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Add minutes to a Date (returns a new Date). */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/** Difference in whole seconds (positive if target is in the future). */
export function secondsUntil(target: Date, now: Date = new Date()): number {
  return Math.floor((target.getTime() - now.getTime()) / 1000);
}

/** Parse "HH:mm" into minutes from midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Format remaining seconds as HH:mm:ss (or MM:ss optionally). */
export function formatCountdown(totalSeconds: number, forceHours = false): string {
  const safe = Math.max(0, totalSeconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0 || forceHours) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export { format, localeId };
