import { describe, expect, it } from "vitest";
import { isRamadan, isRamadanDate } from "@/lib/ramadan";

describe("deteksi Ramadan (Hijriah Umm al-Qura, WIB)", () => {
  it("mengenali tanggal di bulan Ramadan", () => {
    expect(isRamadanDate("2026-03-19")).toBe(true);
    expect(isRamadanDate("2027-02-18")).toBe(true);
    expect(isRamadan(new Date("2027-02-18T04:00:00.000Z"))).toBe(true);
  });

  it("tidak menganggap bulan sebelum/sesudah Ramadan sebagai Ramadan", () => {
    expect(isRamadanDate("2026-02-17")).toBe(false);
    expect(isRamadanDate("2026-11-18")).toBe(false);
    expect(isRamadanDate("2027-03-19")).toBe(false);
  });

  it("menolak tanggal yang tidak valid", () => {
    expect(isRamadanDate("")).toBe(false);
    expect(isRamadanDate("18-11-2026")).toBe(false);
  });
});
