/** Pengaturan bersama untuk layar TV saat shalat berjamaah. */

export const SHALAT_SCREEN_BRIGHT_MS = 60_000;
export const MIN_SHALAT_SCREEN_DURATION_MINUTES = 1;
export const MAX_SHALAT_SCREEN_DURATION_MINUTES = 120;
export const DEFAULT_SHALAT_SCREEN_DURATION_MINUTES = 15;

/**
 * Durasi total layar shalat dihitung sejak iqamah. Nilai dari database bisa
 * kosong atau rusak, jadi selalu normalisasi sebelum dipakai UI maupun TV.
 */
export function normalizeShalatScreenDurationMinutes(value: unknown): number {
  const raw =
    typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(raw)) return DEFAULT_SHALAT_SCREEN_DURATION_MINUTES;
  return Math.min(
    Math.max(Math.trunc(raw), MIN_SHALAT_SCREEN_DURATION_MINUTES),
    MAX_SHALAT_SCREEN_DURATION_MINUTES,
  );
}

/**
 * 0 = masih terang, 1 = redup penuh.
 * 60 detik pertama selalu terang; sisanya meredup linear sampai durasi habis.
 */
export function getShalatScreenDimProgress(
  elapsedMs: number,
  durationMinutes: number,
): number {
  const totalMs = normalizeShalatScreenDurationMinutes(durationMinutes) * 60_000;
  const fadeMs = Math.max(0, totalMs - SHALAT_SCREEN_BRIGHT_MS);
  if (elapsedMs <= SHALAT_SCREEN_BRIGHT_MS || fadeMs === 0) return 0;
  return Math.min(1, Math.max(0, (elapsedMs - SHALAT_SCREEN_BRIGHT_MS) / fadeMs));
}
