"use client";

import {
  AdzanSettings,
  DEFAULT_ADZAN_SETTINGS,
  MUADZIN_OPTIONS,
  MuadzinOption,
} from "@/types/adzan";

const STORAGE_KEY = "abu_dzar_adzan_settings";

let globalAudio: HTMLAudioElement | null = null;
let isAudioUnlocked = false;

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
  volume = 0.8
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  try {
    stopAdzanSound();

    let targetMuadzin: MuadzinOption;
    if (isFajr) {
      // Prioritize Fajr special if requested or user selected fajr
      targetMuadzin =
        MUADZIN_OPTIONS.find((m) => m.id === "fajr-makkah") ??
        getMuadzinOption(muadzinId || "makkah");
    } else {
      const selectedId = muadzinId || getStoredAdzanSettings().selectedMuadzinId;
      targetMuadzin = getMuadzinOption(selectedId);
      // If user selected fajr-makkah but it's not Fajr, fallback to makkah
      if (targetMuadzin.id === "fajr-makkah") {
        targetMuadzin = getMuadzinOption("makkah");
      }
    }

    const audio = new Audio(targetMuadzin.audioSrc);
    audio.volume = Math.max(0, Math.min(1, volume));
    globalAudio = audio;

    return audio.play().catch((err) => {
      console.warn("Autoplay audio blocked or error:", err);
    });
  } catch (error) {
    console.error("Gagal memutar audio adzan:", error);
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
}

export function isAdzanPlaying(): boolean {
  return Boolean(globalAudio && !globalAudio.paused && !globalAudio.ended);
}

export async function requestAdzanNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
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

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        const options: NotificationOptions & { vibrate?: number[] } = {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          vibrate: [200, 100, 200, 100, 400],
          tag: `adzan-${prayerName}-${Date.now()}`,
        };
        reg.showNotification(title, options as NotificationOptions);
      }).catch(() => {
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
