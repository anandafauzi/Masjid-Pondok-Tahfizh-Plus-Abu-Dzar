/**
 * Penanda versi cache data publik.
 *
 * Versi disimpan juga di DB (`app_meta`) supaya invalidasi dari admin
 * terlihat oleh semua instance/serverless, bukan hanya process yang menangani
 * request admin. Pembacaan DB dibatasi ~2 detik sekali agar tidak menambah
 * query pada setiap request publik.
 */
import { after } from "next/server";
import { prisma } from "@/lib/prisma";

const VERSION_KEY = "publicDataVersion";
const SYNC_INTERVAL_MS = 2_000;

let localVersion = 0;
let sharedVersion = 0;
let lastSyncAt = 0;
let syncInFlight = false;

async function refreshSharedVersion(): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    const row = await prisma.appMeta.findUnique({
      where: { key: VERSION_KEY },
      select: { value: true },
    });
    if (row) sharedVersion = row.value;
  } catch {
    // DB belum tersedia atau migrasi belum dijalankan: pakai versi lokal.
  } finally {
    syncInFlight = false;
  }
}

export function getPublicDataVersion(): number {
  if (Date.now() - lastSyncAt >= SYNC_INTERVAL_MS) {
    lastSyncAt = Date.now();
    void refreshSharedVersion();
  }
  return Math.max(localVersion, sharedVersion);
}

export function invalidatePublicDataCache(): void {
  // Update instance ini tanpa menunggu DB.
  localVersion += 1;
  lastSyncAt = 0;

  const syncSharedVersion = async () => {
    try {
      // Instance lain membaca versi terbaru lewat refreshSharedVersion().
      await prisma.appMeta.upsert({
        where: { key: VERSION_KEY },
        update: { value: { increment: 1 } },
        create: { key: VERSION_KEY, value: localVersion },
      });
      sharedVersion = Math.max(sharedVersion, localVersion);
    } catch (error) {
      console.warn("[public-cache] Gagal menyinkronkan versi cache:", error);
    }
  };

  try {
    // Tunda penulisan DB sampai response selesai agar runtime serverless tidak
    // membekukan instance sebelum upsert versi bersama selesai.
    after(syncSharedVersion);
  } catch {
    // after() melempar di luar request scope (script/job): tetap jalankan async.
    void syncSharedVersion();
  }
}
