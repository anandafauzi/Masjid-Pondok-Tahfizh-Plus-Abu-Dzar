import { describe, it, expect } from "vitest";
import { calculateQiblaBearing, formatQiblaBearing } from "../qibla";

describe("qibla calculation", () => {
  it("calculates accurate Qibla bearing for Bogor coordinates", () => {
    // Koordinat Masjid Abu Dzar Rumpin, Bogor: -6.442126, 106.640654
    const bearing = calculateQiblaBearing(-6.442126, 106.640654);
    expect(bearing).toBeGreaterThan(295);
    expect(bearing).toBeLessThan(296);
    expect(bearing.toFixed(2)).toBe("295.28");
  });

  it("formats bearing string with Barat Laut label", () => {
    const formatted = formatQiblaBearing(-6.442126, 106.640654);
    expect(formatted).toBe("295.28° Barat Laut");
  });

  it("handles fallback gracefully on invalid coordinates", () => {
    const fallback = calculateQiblaBearing(NaN, NaN);
    expect(fallback).toBe(295.28);
  });
});
