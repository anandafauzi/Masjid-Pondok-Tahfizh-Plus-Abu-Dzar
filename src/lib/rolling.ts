import { dateOnlyToString } from "@/lib/datetime";

export interface RollingSettingLike {
  id: string;
  imamName?: string;
  khatibName?: string;
  sequenceNumber: number;
  effectiveFrom: Date | string;
  effectiveUntil: Date | string | null;
  isActive: boolean;
  createdAt?: Date | string;
}

function createdAtMs(value: Date | string | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

export function compareRollingSettings(
  a: RollingSettingLike,
  b: RollingSettingLike
): number {
  if (a.sequenceNumber !== b.sequenceNumber) {
    return a.sequenceNumber - b.sequenceNumber;
  }
  const created = createdAtMs(a.createdAt) - createdAtMs(b.createdAt);
  if (created !== 0) return created;
  return a.id.localeCompare(b.id);
}

/** Rentang berlaku valid bila tanggal selesai tidak mendahului tanggal mulai. */
export function isValidEffectiveRange(
  from: Date | string | null | undefined,
  until: Date | string | null | undefined
): boolean {
  if (!from || !until) return true;
  return asUTCDate(until).getTime() >= asUTCDate(from).getTime();
}

function asUTCDate(value: Date | string): Date {
  const ymd = typeof value === "string" ? value.slice(0, 10) : dateOnlyToString(value);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * Hitung jumlah Jumat libur yang jatuh antara anchor dan tanggal target
 * (inklusif). Setiap Jumat libur tidak menggeser giliran, jadi jumlah ini
 * dikurangkan dari jumlah minggu yang sudah berlalu.
 */
function countHolidayWeeks(
  holidayDates: Iterable<Date | string> | undefined,
  anchorMs: number,
  targetMs: number
): number {
  if (!holidayDates) return 0;
  const seen = new Set<string>();
  let count = 0;
  for (const value of holidayDates) {
    const ymd =
      typeof value === "string" ? value.slice(0, 10) : dateOnlyToString(value);
    if (seen.has(ymd)) continue;
    seen.add(ymd);
    const ms = new Date(`${ymd}T00:00:00.000Z`).getTime();
    if (Number.isFinite(ms) && ms >= anchorMs && ms <= targetMs) count += 1;
  }
  return count;
}

export interface RollingResult {
  name: string;
  index: number;
  total: number;
}

/**
 * Resolve which person is scheduled on a given date using a date-based
 * rolling cycle. The cycle starts at the earliest effectiveFrom date and
 * follows the configured order; reordering changes past and future results.
 * Tanggal dalam `holidayDates` (Jumat libur) tidak mengonsumsi giliran, sehingga
 * rotasi berhenti saat libur dan lanjut dari giliran terakhir saat aktif lagi.
 */
export function resolveRolling(
  settings: RollingSettingLike[],
  date: Date,
  holidayDates?: Iterable<Date | string>
): RollingResult | null {
  const target = asUTCDate(date);

  const active = settings
    .filter((s) => {
      if (!s.isActive) return false;
      const from = asUTCDate(s.effectiveFrom);
      if (target.getTime() < from.getTime()) return false;
      if (s.effectiveUntil) {
        const until = asUTCDate(s.effectiveUntil);
        if (target.getTime() > until.getTime()) return false;
      }
      return true;
    })
    .sort(compareRollingSettings);

  // Jangan jatuh ke "semua entri aktif" saat tidak ada konfigurasi yang
  // benar-benar berlaku pada tanggal ini. Fallback lama membuat imam/khatib
  // yang belum mulai atau sudah selesai tetap tampil di jadwal publik.
  if (active.length === 0) return null;

  const anchor = active.reduce((min, s) => {
    const from = asUTCDate(s.effectiveFrom).getTime();
    return Math.min(min, from);
  }, Number.POSITIVE_INFINITY);

  let anchorMs = Number.isFinite(anchor) ? anchor : target.getTime();
  const anchorDate = new Date(anchorMs);

  // If target is Friday (day 5), align anchor to its corresponding Friday
  if (target.getUTCDay() === 5) {
    const anchorDay = anchorDate.getUTCDay();
    const anchorFridayDiff = (5 - anchorDay + 7) % 7;
    anchorDate.setUTCDate(anchorDate.getUTCDate() + anchorFridayDiff);
    anchorMs = anchorDate.getTime();
  }

  const diffDays = Math.round((target.getTime() - anchorMs) / (24 * 60 * 60 * 1000));
  const weeksElapsed = Math.floor(diffDays / 7);
  // Jumat libur tidak mengonsumsi giliran. Kurangi minggu yang terlewat agar
  // rotasi lanjut dari khatib terakhir yang benar-benar bertugas.
  const holidayWeeks = countHolidayWeeks(holidayDates, anchorMs, target.getTime());
  const effectiveWeeks =
    holidayWeeks > 0 ? Math.max(0, weeksElapsed - holidayWeeks) : weeksElapsed;
  const index = ((effectiveWeeks % active.length) + active.length) % active.length;
  const selected = active[index];

  return {
    name: selected.imamName ?? selected.khatibName ?? "",
    index,
    total: active.length,
  };
}
