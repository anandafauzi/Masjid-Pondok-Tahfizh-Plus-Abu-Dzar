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

function asUTCDate(value: Date | string): Date {
  const ymd = typeof value === "string" ? value.slice(0, 10) : dateOnlyToString(value);
  return new Date(`${ymd}T00:00:00.000Z`);
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
 */
export function resolveRolling(
  settings: RollingSettingLike[],
  date: Date
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

  if (active.length === 0) return null;

  const anchor = active.reduce((min, s) => {
    const from = asUTCDate(s.effectiveFrom).getTime();
    return Math.min(min, from);
  }, Number.POSITIVE_INFINITY);

  const weeksElapsed = Math.floor(
    (target.getTime() - anchor) / (7 * 24 * 60 * 60 * 1000)
  );
  const index = ((weeksElapsed % active.length) + active.length) % active.length;
  const selected = active[index];

  return {
    name: selected.imamName ?? selected.khatibName ?? "",
    index,
    total: active.length,
  };
}
