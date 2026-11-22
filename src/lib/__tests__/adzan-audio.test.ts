import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isNativeAndroidApp,
  playAdzanSound,
  requestAdzanNotificationPermission,
  stopAdzanSound,
} from "@/lib/adzan-audio";

type NativeWindow = Window & {
  MasjidNative?: {
    syncAdzanSettings?: (raw: string) => void;
    requestNotifications?: () => boolean | void | Promise<boolean | void>;
    areNotificationsEnabled?: () => boolean;
  };
};

const nativeWindow = () => window as NativeWindow;

afterEach(() => {
  stopAdzanSound();
  delete nativeWindow().MasjidNative;
  vi.unstubAllGlobals();
});

describe("jembatan native Android untuk adzan", () => {
  it("terdeteksi dari keberadaan MasjidNative", () => {
    delete nativeWindow().MasjidNative;
    expect(isNativeAndroidApp()).toBe(false);

    nativeWindow().MasjidNative = { syncAdzanSettings: vi.fn() };
    expect(isNativeAndroidApp()).toBe(true);
  });

  it("tetap memanggil izin native walaupun izin web sudah granted", async () => {
    const requestNotifications = vi.fn(() => undefined);
    nativeWindow().MasjidNative = { requestNotifications };
    vi.stubGlobal("Notification", {
      permission: "granted",
      requestPermission: vi.fn(),
    });

    const granted = await requestAdzanNotificationPermission();

    expect(requestNotifications).toHaveBeenCalledOnce();
    expect(granted).toBe(true);
  });

  it("tidak menganggap void dari bridge native sebagai izin granted", async () => {
    nativeWindow().MasjidNative = { requestNotifications: () => undefined };
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: vi.fn(async () => "denied"),
    });

    const granted = await requestAdzanNotificationPermission();

    expect(granted).toBe(false);
  });

  it("mendeteksi izin native setelah dialog diizinkan", async () => {
    let osGranted = false;
    nativeWindow().MasjidNative = {
      requestNotifications: () => {
        osGranted = true;
      },
      areNotificationsEnabled: () => osGranted,
    };
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: vi.fn(async () => "denied"),
    });

    const granted = await requestAdzanNotificationPermission();

    expect(granted).toBe(true);
  });

  it("memakai reciter pilihan pengguna untuk Shubuh", async () => {
    const srcs: string[] = [];
    vi.stubGlobal(
      "Audio",
      class {
        src: string;
        volume = 1;

        constructor(src: string) {
          this.src = src;
          srcs.push(src);
        }

        addEventListener() {}
        play() {
          return Promise.resolve();
        }
        pause() {}
      },
    );

    await playAdzanSound("madinah", true);
    expect(srcs.at(-1)).toBe("/audio/adzan/madinah.mp3");

    // Khusus Shubuh tidak boleh dipakai untuk shalat selain Shubuh.
    await playAdzanSound("fajr-makkah", false);
    expect(srcs.at(-1)).toBe("/audio/adzan/makkah.mp3");
  });
});
