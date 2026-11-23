export const MASJID_INFO = {
  name: "Masjid Pondok Tahfizh Plus Abu Dzar",
  shortName: "Masjid Abu Dzar",
  address: "Rumpin, Kabupaten Bogor, Jawa Barat",
  latitude: -6.442126,
  longitude: 106.640654,
  timezone: "Asia/Jakarta",
  mapUrl: "https://maps.app.goo.gl/aLWZpi1UhasHeHEP7",
}

export type PrayerSlot =
  | "imsak"
  | "fajr"
  | "sunrise"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha";

export const PRAYER_NAMES = {
  imsak: "Imsak",
  fajr: "Shubuh",
  sunrise: "Terbit",
  dhuhr: "Dzuhur",
  asr: "Ashar",
  maghrib: "Maghrib",
  isha: "Isya",
} as const;

export const PRAYER_NAMES_ARABIC = {
  imsak: "الإمساك",
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
} as const;

/**
 * Alias nama shalat, termasuk ejaan lama yang masih tersimpan di database.
 * Key internal (fajr/dhuhr/...) sengaja tidak diubah agar API dan audio lama
 * tetap kompatibel.
 */
const PRAYER_SLOT_BY_LABEL: Record<string, PrayerSlot> = {
  imsak: "imsak",
  fajr: "fajr",
  subuh: "fajr",
  shubuh: "fajr",
  sunrise: "sunrise",
  terbit: "sunrise",
  dhuhr: "dhuhr",
  zuhur: "dhuhr",
  dzuhur: "dhuhr",
  asr: "asr",
  asar: "asr",
  ashar: "asr",
  maghrib: "maghrib",
  magrib: "maghrib",
  isha: "isha",
  isya: "isha",
};

/** Kunci internal (fajr, dhuhr, ...) dari label baru maupun label lama. */
export function prayerSlotOf(value?: string | null): PrayerSlot | null {
  // JSON dari klien bisa saja mengirim angka/objek. Jangan sampai .trim()
  // melempar TypeError dan mengubah 400 menjadi 500.
  if (typeof value !== "string") return null;
  return PRAYER_SLOT_BY_LABEL[value.trim().toLowerCase()] ?? null;
}

/** Label tampil kanonik. Data lama ("Subuh", "Zuhur", ...) ikut dinormalisasi. */
export function normalizePrayerName(value?: string | null): string {
  if (typeof value !== "string") return "";
  const slot = prayerSlotOf(value);
  if (slot) return PRAYER_NAMES[slot];
  return value.trim();
}

/** Cocokkan label lama/baru dengan satu shalat tanpa tergantung ejaan. */
export function isPrayerName(
  value: string | null | undefined,
  slot: Exclude<PrayerSlot, "imsak" | "sunrise">,
): boolean {
  return prayerSlotOf(value) === slot;
}

/** Nama Arab untuk label shalat ("Shubuh", "Dzuhur", dst), termasuk alias lama. */
export function getPrayerArabicName(name: string): string {
  const slot = prayerSlotOf(name);
  return slot ? PRAYER_NAMES_ARABIC[slot] : "";
}

/**
 * Cari baris petugas (imam/muadzin) memakai prayerKey, bukan label tampilan.
 *
 * Label tampilan bisa berupa "Jumat" (dzuhur) atau label lama ("Zuhur"), jadi
 * mencocokkannya lewat prayerSlotOf(label) berisiko menghasilkan null dan
 * memilih baris yang salah. Key internal (fajr/dhuhr/...) selalu stabil.
 */
export function pickImamForSlot<T extends { prayerName?: string | null }>(
  rows: readonly T[] | null | undefined,
  prayerKey: string | null | undefined,
): T | undefined {
  const slot = prayerSlotOf(prayerKey);
  if (!slot) return undefined;
  return rows?.find((row) => prayerSlotOf(row.prayerName) === slot);
}
