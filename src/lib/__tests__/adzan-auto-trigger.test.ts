import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const audioMocks = vi.hoisted(() => ({
  getStoredAdzanSettings: vi.fn(),
  isNativeAndroidApp: vi.fn(),
  playAdzanSound: vi.fn(),
  showAdzanNotification: vi.fn(),
}));

vi.mock("@/lib/adzan-audio", () => audioMocks);

import {
  triggerPrayerAlerts,
  type AutoTriggerEvent,
  type FiredPrayerKeys,
} from "@/lib/adzan-auto-trigger";

const ADHAN_MS = Date.parse("2026-11-23T17:00:00+07:00");
const IQAMAH_MS = ADHAN_MS + 20 * 60_000;

const event: AutoTriggerEvent = {
  key: "maghrib",
  label: "Maghrib",
  adhanTarget: new Date(ADHAN_MS).toISOString(),
  iqamahTarget: new Date(IQAMAH_MS).toISOString(),
};

function freshFired(): FiredPrayerKeys {
  return { adhan: new Set<string>(), iqamah: new Set<string>() };
}

function notificationSpy() {
  return globalThis.Notification as unknown as ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  vi.resetAllMocks();
  audioMocks.getStoredAdzanSettings.mockReturnValue({
    soundEnabled: true,
    notificationsEnabled: true,
    selectedMuadzinId: "makkah",
    volume: 0.8,
  });
  audioMocks.isNativeAndroidApp.mockReturnValue(false);

  const notification = vi.fn() as unknown as typeof Notification & {
    permission: NotificationPermission;
  };
  Object.defineProperty(notification, "permission", {
    value: "granted",
    writable: true,
  });
  vi.stubGlobal("Notification", notification);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("triggerPrayerAlerts", () => {
  it("memicu adzan dan iqamah tepat sekali per event", () => {
    const fired = freshFired();

    triggerPrayerAlerts([event], ADHAN_MS + 1_000, fired);
    expect(audioMocks.playAdzanSound).toHaveBeenCalledTimes(1);
    expect(audioMocks.showAdzanNotification).toHaveBeenCalledWith("Maghrib");

    triggerPrayerAlerts([event], ADHAN_MS + 2_000, fired);
    expect(audioMocks.playAdzanSound).toHaveBeenCalledTimes(1);

    triggerPrayerAlerts([event], IQAMAH_MS + 1_000, fired);
    expect(notificationSpy()).toHaveBeenCalledTimes(1);
    expect(notificationSpy().mock.calls[0][0]).toContain("Iqamah Maghrib");

    triggerPrayerAlerts([event], IQAMAH_MS + 2_000, fired);
    expect(notificationSpy()).toHaveBeenCalledTimes(1);
  });

  it("melewati adzan bila dipanggil dari halaman yang sudah punya taskbar", () => {
    triggerPrayerAlerts([event], ADHAN_MS + 1_000, freshFired(), {
      includeAdhan: false,
    });
    expect(audioMocks.playAdzanSound).not.toHaveBeenCalled();
    expect(audioMocks.showAdzanNotification).not.toHaveBeenCalled();

    triggerPrayerAlerts([event], IQAMAH_MS + 1_000, freshFired(), {
      includeAdhan: false,
    });
    expect(notificationSpy()).toHaveBeenCalledTimes(1);
  });

  it("tidak memicu apa pun di WebView APK karena alarm native yang berjalan", () => {
    audioMocks.isNativeAndroidApp.mockReturnValue(true);

    triggerPrayerAlerts([event], ADHAN_MS + 1_000, freshFired());
    triggerPrayerAlerts([event], IQAMAH_MS + 1_000, freshFired());

    expect(audioMocks.playAdzanSound).not.toHaveBeenCalled();
    expect(audioMocks.showAdzanNotification).not.toHaveBeenCalled();
    expect(notificationSpy()).not.toHaveBeenCalled();
  });

  it("tidak memicu notifikasi di luar jendela 60 detik", () => {
    triggerPrayerAlerts([event], IQAMAH_MS + 61_000, freshFired());
    expect(notificationSpy()).not.toHaveBeenCalled();
  });
});
