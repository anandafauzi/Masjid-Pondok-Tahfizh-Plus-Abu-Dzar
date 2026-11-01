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
});
