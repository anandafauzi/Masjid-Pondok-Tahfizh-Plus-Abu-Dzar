/** Penanda baris Imam Isya yang dibuat otomatis dari jadwal Tarawih. */
export const TARAWIH_ISYA_NOTES = "Diisi otomatis dari jadwal Tarawih";

/** Format tampilan imam Tarawih, dengan dukungan dua imam. */
export function tarawihImamLabel(imamName: string, imamName2?: string | null) {
  const first = imamName.trim();
  const second = imamName2?.trim();
  return second ? `${first} & ${second}` : first;
}

/** Nama muadzin default saat baris Isya otomatis belum ada. */
export const DEFAULT_AUTO_MUADZIN = "Santri Pondok Tahfizh";
