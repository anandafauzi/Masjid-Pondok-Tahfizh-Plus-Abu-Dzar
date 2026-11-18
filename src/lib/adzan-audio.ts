"use client";

import {
  AdzanSettings,
  DEFAULT_ADZAN_SETTINGS,
  MUADZIN_OPTIONS,
  MuadzinOption,
} from "@/types/adzan";

const STORAGE_KEY = "abu_dzar_adzan_settings";

interface MasjidNativeBridge {
  syncAdzanSettings?: (raw: string) => void;
  requestNotifications?: () => boolean | void | Promise<boolean | void>;
  areNotificationsEnabled?: () => boolean;
}

function getNativeBridge(): MasjidNativeBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { MasjidNative?: MasjidNativeBridge }).MasjidNative;
}

/** True when the page runs inside the Android WebView with the native bridge. */
export function isNativeAndroidApp(): boolean {
  return Boolean(getNativeBridge());
}

let globalAudio: HTMLAudioElement | null = null;
let isAudioUnlocked = false;
let onAudioEnded: (() => void) | null = null;

function finishAudio(): void {
  const callback = onAudioEnded;
  onAudioEnded = null;
  callback?.();
}

export function getStoredAdzanSettings(): AdzanSettings {
  if (typeof window === "undefined") return DEFAULT_ADZAN_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADZAN_SETTINGS;
    return { ...DEFAULT_ADZAN_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ADZAN_SETTINGS;
  }
}

export function saveStoredAdzanSettings(settings: Partial<AdzanSettings>): AdzanSettings {
  if (typeof window === "undefined") return DEFAULT_ADZAN_SETTINGS;
  try {
    const current = getStoredAdzanSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    try {
      getNativeBridge()?.syncAdzanSettings?.(JSON.stringify(updated));
    } catch {
      // Aplikasi Web biasa tidak punya bridge native.
    }
    return updated;
  } catch {
    return DEFAULT_ADZAN_SETTINGS;
  }
}

export function getMuadzinOption(id: string): MuadzinOption {
  return (
    MUADZIN_OPTIONS.find((m) => m.id === id) ??
    MUADZIN_OPTIONS[0]
  );
}

// User-gesture audio unlocker for mobile Safari & Chrome
export function unlockAudioContext(): void {
  if (typeof window === "undefined" || isAudioUnlocked) return;
  try {
    const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
    silent.volume = 0;
    silent.play().then(() => {
      isAudioUnlocked = true;
    }).catch(() => {
      // Non-fatal
    });
  } catch {
    // Ignore
  }
}

export function playAdzanSound(
  muadzinId?: string,
  isFajr = false,
  volume = 0.8,
  onEnded?: () => void
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  try {
    stopAdzanSound();
    onAudioEnded = onEnded ?? null;

    const selectedId = muadzinId || getStoredAdzanSettings().selectedMuadzinId;
    let targetMuadzin = getMuadzinOption(selectedId);
    // "Khusus Subuh" hanya dipakai saat Subuh; untuk shalat lain pakai Makkah.
    // Reciter pilihan pengguna tetap dihormati, termasuk untuk Subuh.
    if (targetMuadzin.isFajrSpecial && !isFajr) {
      targetMuadzin = getMuadzinOption("makkah");
    }

    const audio = new Audio(targetMuadzin.audioSrc);
    audio.volume = Math.max(0, Math.min(1, volume));
    globalAudio = audio;

    // Reset state pemutar di UI ketika audio benar-benar selesai/gagal.
    audio.addEventListener(
      "ended",
      () => {
        if (globalAudio === audio) globalAudio = null;
        finishAudio();
      },
      { once: true }
    );
    audio.addEventListener(
      "error",
      () => {
        if (globalAudio === audio) globalAudio = null;
        finishAudio();
      },
      { once: true }
    );

    return audio.play().catch((err) => {
      console.warn("Autoplay audio blocked or error:", err);
      if (globalAudio === audio) globalAudio = null;
      finishAudio();
    });
  } catch (error) {
    console.error("Gagal memutar audio adzan:", error);
    finishAudio();
    return Promise.resolve();
  }
}

export function stopAdzanSound(): void {
  if (typeof window === "undefined") return;
  if (globalAudio) {
    try {
      globalAudio.pause();
      globalAudio.currentTime = 0;
    } catch {
      // ignore
    }
    globalAudio = null;
  }
  finishAudio();
}

export async function requestAdzanNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Di APK Android, izin yang dibutuhkan adalah POST_NOTIFICATIONS native.
  // Web Notification API di WebView tidak meminta izin sistem operasi.
  let nativeGranted = false;
  const nativeBridge = getNativeBridge();
  if (nativeBridge?.requestNotifications) {
    try {
      const result = await nativeBridge.requestNotifications();
      // bridge lama mengembalikan void: jangan dianggap sebagai izin granted.
      nativeGranted = result === true;
    } catch {
      nativeGranted = false;
    }

    // Dialog izin Android asynchronous. Cek ulang status aslinya selama beberapa
    // detik agar UI tidak menyimpan "notificationsEnabled: false" setelah izin diketuk.
    if (!nativeGranted && nativeBridge.areNotificationsEnabled) {
      for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise<void>((resolve) => setTimeout(resolve, 250));
        try {
          if (nativeBridge.areNotificationsEnabled()) {
            nativeGranted = true;
            break;
          }
        } catch {
          // Bridge belum siap; coba lagi.
        }
      }
    }
  }

  if (!("Notification" in window)) return nativeGranted;
  if (Notification.permission === "granted") return true;

  try {
    const result = await Notification.requestPermission();
    return result === "granted" || nativeGranted;
  } catch {
    return nativeGranted;
  }
}

export function showAdzanNotification(
  prayerName: string,
  muadzinName?: string
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const title = `🕌 Waktu Shalat ${prayerName} Telah Masuk!`;
    const body = `Pondok Tahfizh Plus Abu Dzar: Mari tunaikan shalat ${prayerName}. Kumandang adzan oleh ${
      muadzinName ?? "Muadzin"
    }.`;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          const options: NotificationOptions & {
            vibrate?: number[];
            data?: { url?: string };
          } = {
            body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            vibrate: [200, 100, 200, 100, 400],
            tag: `adzan-${prayerName}-${Date.now()}`,
            data: { url: "/adzan-iqamah" },
          };
          return reg.showNotification(title, options as NotificationOptions);
        })
        .catch(() => {
          new Notification(title, {
            body,
            icon: "/icon-192.png",
          });
        });
    } else {
      new Notification(title, {
        body,
        icon: "/icon-192.png",
      });
    }
  } catch (err) {
    console.error("Gagal menampilkan notifikasi adzan:", err);
  }
}
