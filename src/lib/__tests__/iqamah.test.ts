import { describe, expect, it } from "vitest";
import { computeIqamahEvents, getNextIqamah } from "@/lib/iqamah";
import type { PrayerTimesStrings } from "@/lib/prayer-times";
import { dateOnlyToUTC } from "@/lib/datetime";

describe("iqamah calculations", () => {
  const dateOnly = dateOnlyToUTC("2026-11-01");
  const prayerTimes: PrayerTimesStrings = {
    imsak: "04:20",
    fajr: "04:30",
    sunrise: "05:45",
    dhuhr: "11:58",
    asr: "15:20",
    maghrib: "17:55",
    isha: "19:05",
  };

  it("uses delay minutes by default", () => {
    const settings = [
      { prayerName: "Subuh", mode: "DELAY_MINUTES" as const, delayMinutes: 15, fixedIqamahTime: null },
      { prayerName: "Zuhur", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
      { prayerName: "Asar", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
      { prayerName: "Magrib", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
      { prayerName: "Isya", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
    ];
    const events = computeIqamahEvents(dateOnly, prayerTimes, settings);
    const subuh = events.find((e) => e.key === "fajr")!;
    expect(subuh.mode).toBe("DELAY_MINUTES");
    expect(subuh.delayMinutes).toBe(15);
    expect(subuh.iqamahTime).toBe("04:45");
  });

  it("uses fixed time when mode is FIXED_TIME", () => {
    const settings = [
      { prayerName: "Magrib", mode: "FIXED_TIME" as const, delayMinutes: 5, fixedIqamahTime: "18:00" },
    ];
    const events = computeIqamahEvents(dateOnly, prayerTimes, settings);
    const maghrib = events.find((e) => e.key === "maghrib")!;
    expect(maghrib.mode).toBe("FIXED_TIME");
    expect(maghrib.iqamahTime).toBe("18:00");
  });

  it("getNextIqamah returns upcoming iqamah", () => {
    const settings = [
      { prayerName: "Subuh", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
      { prayerName: "Zuhur", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
      { prayerName: "Asar", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
      { prayerName: "Magrib", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
      { prayerName: "Isya", mode: "DELAY_MINUTES" as const, delayMinutes: 10, fixedIqamahTime: null },
    ];
    const events = computeIqamahEvents(dateOnly, prayerTimes, settings);
    const now = new Date("2026-11-01T04:35:00+07:00");
    const next = getNextIqamah(events, now);
    expect(next?.key).toBe("fajr");
    expect(next?.isBetweenAdhanAndIqamah).toBe(true);
  });

  it("getNextIqamah returns null if all passed", () => {
    const settings = [
      { prayerName: "Subuh", mode: "DELAY_MINUTES" as const, delayMinutes: 5, fixedIqamahTime: null },
      { prayerName: "Zuhur", mode: "DELAY_MINUTES" as const, delayMinutes: 5, fixedIqamahTime: null },
      { prayerName: "Asar", mode: "DELAY_MINUTES" as const, delayMinutes: 5, fixedIqamahTime: null },
      { prayerName: "Magrib", mode: "DELAY_MINUTES" as const, delayMinutes: 5, fixedIqamahTime: null },
      { prayerName: "Isya", mode: "DELAY_MINUTES" as const, delayMinutes: 5, fixedIqamahTime: null },
    ];
    const events = computeIqamahEvents(dateOnly, prayerTimes, settings);
    const now = new Date("2026-11-02T00:00:00+07:00");
    expect(getNextIqamah(events, now)).toBeNull();
  });
});
