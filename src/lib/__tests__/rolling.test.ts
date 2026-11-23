import { describe, expect, it } from "vitest";
import { compareRollingSettings, isValidEffectiveRange, resolveRolling } from "@/lib/rolling";
import { dateOnlyToUTC } from "@/lib/datetime";

describe("rolling imam/khatib", () => {
  it("compares by sequence number then createdAt then id", () => {
    const a = { id: "b", sequenceNumber: 2, effectiveFrom: "2026-01-01", effectiveUntil: null, isActive: true, createdAt: "2026-01-01T00:00:00Z" };
    const b = { id: "a", sequenceNumber: 1, effectiveFrom: "2026-01-01", effectiveUntil: null, isActive: true, createdAt: "2026-01-01T00:00:00Z" };
    expect(compareRollingSettings(a, b)).toBeGreaterThan(0);
  });

  it("validates effective range", () => {
    expect(isValidEffectiveRange("2026-01-01", "2026-12-31")).toBe(true);
    expect(isValidEffectiveRange("2026-12-31", "2026-01-01")).toBe(false);
    expect(isValidEffectiveRange("2026-01-01", null)).toBe(true);
  });

  it("resolves by date-based cycle", () => {
    const settings = [
      { id: "1", imamName: "Ust. A", sequenceNumber: 1, effectiveFrom: "2026-01-02", effectiveUntil: null, isActive: true, createdAt: "2026-01-01T00:00:00Z" },
      { id: "2", imamName: "Ust. B", sequenceNumber: 2, effectiveFrom: "2026-01-02", effectiveUntil: null, isActive: true, createdAt: "2026-01-01T00:00:00Z" },
      { id: "3", imamName: "Ust. C", sequenceNumber: 3, effectiveFrom: "2026-01-02", effectiveUntil: null, isActive: true, createdAt: "2026-01-01T00:00:00Z" },
    ];
    const result = resolveRolling(settings, dateOnlyToUTC("2026-01-02"));
    expect(result?.name).toBe("Ust. A");
    expect(result?.total).toBe(3);
  });

  it("skips inactive and respects effectiveUntil", () => {
    const settings = [
      { id: "1", imamName: "Ust. A", sequenceNumber: 1, effectiveFrom: "2026-01-01", effectiveUntil: "2026-01-07", isActive: true, createdAt: "2026-01-01T00:00:00Z" },
      { id: "2", imamName: "Ust. B", sequenceNumber: 2, effectiveFrom: "2026-01-01", effectiveUntil: null, isActive: true, createdAt: "2026-01-01T00:00:00Z" },
    ];
    const result = resolveRolling(settings, dateOnlyToUTC("2026-01-09"));
    expect(result?.name).toBe("Ust. B");
  });

  const khatibSettings = [
    { id: "1", khatibName: "Ust. A", sequenceNumber: 1, effectiveFrom: "2026-01-02", effectiveUntil: null, isActive: true },
    { id: "2", khatibName: "Ust. B", sequenceNumber: 2, effectiveFrom: "2026-01-02", effectiveUntil: null, isActive: true },
    { id: "3", khatibName: "Ust. C", sequenceNumber: 3, effectiveFrom: "2026-01-02", effectiveUntil: null, isActive: true },
  ];

  it("tetap bersiklus seperti semula bila tidak ada libur", () => {
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-02"))?.name).toBe("Ust. A");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-09"))?.name).toBe("Ust. B");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-16"))?.name).toBe("Ust. C");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-23"))?.name).toBe("Ust. A");
  });

  it("berhenti saat Jumat libur lalu lanjut dari jadwal terakhir", () => {
    const holidays = ["2026-01-09"];
    // Tanggal libur tetap mengembalikan giliran terakhir; UI yang menampilkan "Libur".
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-09"), holidays)?.name).toBe("Ust. A");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-16"), holidays)?.name).toBe("Ust. B");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-23"), holidays)?.name).toBe("Ust. C");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-30"), holidays)?.name).toBe("Ust. A");
  });

  it("tidak melewati giliran untuk setiap Jumat libur", () => {
    const holidays = ["2026-01-09", "2026-01-23"];
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-16"), holidays)?.name).toBe("Ust. B");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-30"), holidays)?.name).toBe("Ust. C");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-02-06"), holidays)?.name).toBe("Ust. A");
  });

  it("libur pada Jumat pertama tidak memakan giliran", () => {
    const holidays = ["2026-01-02"];
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-02"), holidays)?.name).toBe("Ust. A");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-09"), holidays)?.name).toBe("Ust. A");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-16"), holidays)?.name).toBe("Ust. B");
  });

  it("mengabaikan tanggal libur sebelum rotasi mulai", () => {
    const holidays = ["2025-12-26"];
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-02"), holidays)?.name).toBe("Ust. A");
    expect(resolveRolling(khatibSettings, dateOnlyToUTC("2026-01-09"), holidays)?.name).toBe("Ust. B");
  });
});
