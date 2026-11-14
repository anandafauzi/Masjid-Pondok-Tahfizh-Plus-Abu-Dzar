/**
 * Penanda versi cache data publik.
 *
 * Modul ini sengaja tidak mengimpor apa pun agar bisa dipakai oleh route API
 * (lewat `revalidateAllAppPaths`) maupun oleh `public-data.ts` tanpa membuat
 * siklus dependency.
 */
let publicDataVersion = 0;

export function invalidatePublicDataCache(): void {
  publicDataVersion += 1;
}

export function getPublicDataVersion(): number {
  return publicDataVersion;
}
