import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHALAT_SCREEN_DURATION_MINUTES,
  getShalatScreenDimProgress,
  normalizeShalatScreenDurationMinutes,
} from "@/lib/tv-display-settings";

describe("pengaturan durasi layar shalat TV", () => {
  it("memakai default bila nilai kosong atau rusak", () => {
    expect(normalizeShalatScreenDurationMinutes(undefined)).toBe(
      DEFAULT_SHALAT_SCREEN_DURATION_MINUTES,
    );
    expect(normalizeShalatScreenDurationMinutes("bukan angka")).toBe(
      DEFAULT_SHALAT_SCREEN_DURATION_MINUTES,
    );
  });

  it("membatasi durasi antara 1 dan 120 menit", () => {
    expect(normalizeShalatScreenDurationMinutes(0)).toBe(1);
    expect(normalizeShalatScreenDurationMinutes(999)).toBe(120);
    expect(normalizeShalatScreenDurationMinutes("23")).toBe(23);
  });

  it("terang penuh pada 60 detik pertama", () => {
    expect(getShalatScreenDimProgress(0, 15)).toBe(0);
    expect(getShalatScreenDimProgress(59_999, 15)).toBe(0);
    expect(getShalatScreenDimProgress(60_000, 15)).toBe(0);
  });

  it("meredup linear setelah 60 detik pertama", () => {
    // Durasi 5 menit => 4 menit fase redup.
    expect(getShalatScreenDimProgress(180_000, 5)).toBe(0.5);
    expect(getShalatScreenDimProgress(300_000, 5)).toBe(1);
    expect(getShalatScreenDimProgress(600_000, 5)).toBe(1);
  });
});
