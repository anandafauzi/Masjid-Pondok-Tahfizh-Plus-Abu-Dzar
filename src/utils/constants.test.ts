import { describe, expect, it } from "vitest";
import {
  getPrayerArabicName,
  isPrayerName,
  normalizePrayerName,
  prayerSlotOf,
} from "@/utils/constants";

describe("nama shalat", () => {
  it("memakai ejaan baru sebagai label kanonik", () => {
    expect(normalizePrayerName("fajr")).toBe("Shubuh");
    expect(normalizePrayerName("dhuhr")).toBe("Dzuhur");
    expect(normalizePrayerName("asr")).toBe("Ashar");
    expect(normalizePrayerName("maghrib")).toBe("Maghrib");
    expect(normalizePrayerName("isha")).toBe("Isya");
  });

  it("menerima ejaan lama dari data tersimpan", () => {
    expect(normalizePrayerName("Subuh")).toBe("Shubuh");
    expect(normalizePrayerName("Zuhur")).toBe("Dzuhur");
    expect(normalizePrayerName("Asar")).toBe("Ashar");
    expect(normalizePrayerName("Magrib")).toBe("Maghrib");
    expect(prayerSlotOf("magrib")).toBe("maghrib");
  });

  it("mencocokkan label lama dan baru ke slot yang sama", () => {
    expect(isPrayerName("Subuh", "fajr")).toBe(true);
    expect(isPrayerName("Shubuh", "fajr")).toBe(true);
    expect(isPrayerName("Zuhur", "dhuhr")).toBe(true);
    expect(isPrayerName("Dzuhur", "dhuhr")).toBe(true);
    expect(isPrayerName("Subuh", "dhuhr")).toBe(false);
  });

  it("tetap memberi nama Arab untuk label lama", () => {
    expect(getPrayerArabicName("Subuh")).toBe("الفجر");
    expect(getPrayerArabicName("Shubuh")).toBe("الفجر");
    expect(getPrayerArabicName("Zuhur")).toBe("الظهر");
    expect(getPrayerArabicName("Magrib")).toBe("المغرب");
  });

  it("tidak melempar saat menerima nilai non-string dari JSON", () => {
    expect(normalizePrayerName(5 as unknown as string)).toBe("");
    expect(normalizePrayerName(null)).toBe("");
    expect(prayerSlotOf({} as unknown as string)).toBeNull();
    expect(isPrayerName(5 as unknown as string, "fajr")).toBe(false);
  });
});
