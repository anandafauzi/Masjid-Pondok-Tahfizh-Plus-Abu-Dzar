"use client";

import {
  getStoredAdzanSettings,
  isNativeAndroidApp,
  playAdzanSound,
  showAdzanNotification,
} from "@/lib/adzan-audio";

/** Sama dengan window trigger pada taskbar: cukup longgar untuk tab yang sedikit throttle. */
export const PRAYER_ALERT_WINDOW_MS = 60_000;

export interface AutoTriggerEvent {
  key: string;
  label: string;
  adhanTarget: string;
  iqamahTarget: string;
}

export interface FiredPrayerKeys {
  adhan: Set<string>;
  iqamah: Set<string>;
}

interface TriggerOptions {
  /** Taskbar publik sudah memutar adzan; halaman adzan hanya butuh iqamah. */
  includeAdhan?: boolean;
  /** Di WebView APK, alarm native yang berhak memutar suara/notifikasi. */
  respectNativeBridge?: boolean;
}

function showIqamahNotification(prayerName: string, targetMs: number): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const settings = getStoredAdzanSettings();
  if (!settings.notificationsEnabled) return;

  const title = `🕌 Iqamah ${prayerName}`;
  const body = `Segera berdiri dan rapatkan shaf untuk shalat ${prayerName} berjamaah.`;
  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Tag stabil per event: tab ganda tidak menumpuk notifikasi iqamah yang sama.
    tag: `iqamah-${prayerName}-${targetMs}`,
    data: { url: "/adzan-iqamah" },
  } as NotificationOptions;

  try {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(title, options))
        .catch(() => new Notification(title, options));
    } else {
      new Notification(title, options);
    }
  } catch {
    // Non-fatal: notifikasi gagal tidak boleh mengganggu halaman.
  }
}

export function triggerPrayerAlerts(
  events: AutoTriggerEvent[],
  now: number,
  fired: FiredPrayerKeys,
  options: TriggerOptions = {},
): void {
  if (typeof window === "undefined") return;

  const includeAdhan = options.includeAdhan ?? true;
  const respectNativeBridge = options.respectNativeBridge ?? true;
  if (respectNativeBridge && isNativeAndroidApp()) return;

  const settings = getStoredAdzanSettings();

  for (const event of events) {
    const adhanMs = new Date(event.adhanTarget).getTime();
    const iqamahMs = new Date(event.iqamahTarget).getTime();

    if (
      includeAdhan &&
      Number.isFinite(adhanMs) &&
      now >= adhanMs &&
      now - adhanMs < PRAYER_ALERT_WINDOW_MS
    ) {
      const key = `${event.key}-${adhanMs}`;
      if (!fired.adhan.has(key)) {
        fired.adhan.add(key);
        if (settings.soundEnabled) {
          playAdzanSound(
            settings.selectedMuadzinId,
            event.key === "fajr",
            settings.volume,
          );
        }
        if (settings.notificationsEnabled) showAdzanNotification(event.label);
      }
    }

    if (
      Number.isFinite(iqamahMs) &&
      now >= iqamahMs &&
      now - iqamahMs < PRAYER_ALERT_WINDOW_MS
    ) {
      const key = `iq-${event.key}-${iqamahMs}`;
      if (!fired.iqamah.has(key)) {
        fired.iqamah.add(key);
        showIqamahNotification(event.label, iqamahMs);
      }
    }
  }
}
