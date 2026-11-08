import { Coordinates, Qibla } from "adhan";

/**
 * Menghitung sudut arah kiblat dari koordinat lintang (latitude) & bujur (longitude)
 * menuju Ka'bah di Makkah (21.4225° N, 39.8262° E).
 */
export function calculateQiblaBearing(latitude: number, longitude: number): number {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return 295.28;
  }
  try {
    const val = Qibla(new Coordinates(latitude, longitude));
    return Number.isNaN(val) ? 295.28 : val;
  } catch {
    // Fallback default koordinat Masjid Abu Dzar (Rumpin, Bogor)
    return 295.28;
  }
}

/**
 * Menghasilkan teks format sudut kiblat (mis. "295.28° Barat Laut")
 */
export function formatQiblaBearing(latitude: number, longitude: number): string {
  const angle = calculateQiblaBearing(latitude, longitude);
  return `${angle.toFixed(2)}° Barat Laut`;
}
