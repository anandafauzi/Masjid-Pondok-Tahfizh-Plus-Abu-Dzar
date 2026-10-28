export interface WeeklyImamItem {
  id: string; // e.g. "weekly-1-Subuh"
  dayOfWeek: number; // 0 = Ahad, 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu
  prayerName: string; // "Subuh" | "Zuhur" | "Asar" | "Magrib" | "Isya"
  imamName: string;
  muadzinName: string;
  isPermanent: boolean; // Tetap Selamanya (berlaku rutin tanpa tanggal berakhir)
  effectiveFrom: string; // YYYY-MM-DD
  effectiveUntil: string | null; // YYYY-MM-DD or null
  notes?: string | null;
  isActive: boolean;
}

export const PRAYERS = ["Subuh", "Zuhur", "Asar", "Magrib", "Isya"] as const;

export const DAYS_OF_WEEK = [
  { value: 1, name: "Senin", short: "Sen" },
  { value: 2, name: "Selasa", short: "Sel" },
  { value: 3, name: "Rabu", short: "Rab" },
  { value: 4, name: "Kamis", short: "Kam" },
  { value: 5, name: "Jumat", short: "Jum" },
  { value: 6, name: "Sabtu", short: "Sab" },
  { value: 0, name: "Ahad", short: "Ahd" },
];
