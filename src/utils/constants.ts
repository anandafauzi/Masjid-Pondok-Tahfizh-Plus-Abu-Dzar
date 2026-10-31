export const MASJID_INFO = {
  name: "Masjid Pondok Tahfizh Plus Abu Dzar",
  shortName: "Masjid Abu Dzar",
  address: "Rumpin, Kabupaten Bogor, Jawa Barat",
  latitude: -6.442126,
  longitude: 106.640654,
  timezone: "Asia/Jakarta",
  mapUrl: "https://maps.app.goo.gl/aLWZpi1UhasHeHEP7",
}

export const PRAYER_NAMES = {
  imsak: "Imsak",
  fajr: "Subuh",
  sunrise: "Terbit",
  dhuhr: "Zuhur",
  asr: "Asar",
  maghrib: "Magrib",
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

/** Map nama shalat berbahasa Indonesia ke key PRAYER_NAMES_ARABIC. */
const PRAYER_KEY_BY_LABEL: Record<string, keyof typeof PRAYER_NAMES_ARABIC> = {
  imsak: "imsak",
  subuh: "fajr",
  terbit: "sunrise",
  zuhur: "dhuhr",
  asar: "asr",
  magrib: "maghrib",
  isya: "isha",
};

/** Nama Arab untuk label shalat ("Subuh", "Zuhur", dst). */
export function getPrayerArabicName(name: string): string {
  const key = PRAYER_KEY_BY_LABEL[name.trim().toLowerCase()];
  return key ? PRAYER_NAMES_ARABIC[key] : "";
}
