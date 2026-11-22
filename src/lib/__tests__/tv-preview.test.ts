import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TvData } from "@/lib/public-data";
import {
  DEFAULT_TV_PREVIEW_CONFIG,
  buildPreviewTvData,
  type TvPreviewConfig,
} from "@/lib/tv-preview";

const NOW = Date.parse("2026-11-18T19:00:00+07:00");

function baseData(): TvData {
  return {
    serverTime: new Date(NOW).toISOString(),
    mosque: {
      name: "Masjid Uji",
      logoUrl: null,
      address: "Rumpin",
      mapUrl: "#",
      calculationMethod: "MWL",
    },
    today: "2026-11-18",
    isFriday: false,
    isRamadan: false,
    tarawihToday: null,
    prayerTimes: {},
    nextPrayer: {
      key: "maghrib",
      label: "Maghrib",
      time: "18:05",
      target: new Date(NOW - 5 * 60_000).toISOString(),
      tomorrow: false,
    },
    iqamahEvents: [
      {
        key: "maghrib",
        label: "Maghrib",
        adhanTime: "18:05",
        iqamahTime: "18:10",
        adhanTarget: new Date(NOW - 5 * 60_000).toISOString(),
        iqamahTarget: new Date(NOW).toISOString(),
        mode: "DELAY_MINUTES",
      },
    ],
    nextIqamah: null,
    imamToday: [],
    imamTomorrowSubuh: null,
    imamRoster: [],
    imamWeekly: [],
    kajian: [],
    advice: [],
    runningTexts: [],
    display: {
      slideIntervalSeconds: 10,
      autoRotateEnabled: true,
      tickerSpeed: 50,
      tickerEnabled: true,
      showHijriDate: true,
      themeSettings: {},
    },
    khutbah: null,
  } as unknown as TvData;
}

function config(phase: TvPreviewConfig["phase"], duration = 5): TvPreviewConfig {
  return {
    ...DEFAULT_TV_PREVIEW_CONFIG,
    phase,
    form: {
      ...DEFAULT_TV_PREVIEW_CONFIG.form,
      slideIntervalSeconds: 7,
      themeSettings: {
        ...DEFAULT_TV_PREVIEW_CONFIG.form.themeSettings,
        shalatScreenDurationMinutes: duration,
      },
    },
  };
}

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pratinjau layar TV", () => {
  it("membuat fase shalat terang langsung aktif", () => {
    const data = buildPreviewTvData(baseData(), config("shalat-bright"));

    const iqamah = new Date(data.iqamahEvents[0].iqamahTarget).getTime();
    expect(NOW - iqamah).toBe(30_000);
    expect(data.display.slideIntervalSeconds).toBe(7);
    expect(data.display.themeSettings?.shalatScreenDurationMinutes).toBe(5);
  });

  it("membuat fase redup aktif di tengah durasi", () => {
    const data = buildPreviewTvData(baseData(), config("shalat-dim", 5));

    const iqamah = new Date(data.iqamahEvents[0].iqamahTarget).getTime();
    expect(iqamah).toBeLessThan(NOW - 60_000);
    expect(iqamah).toBeGreaterThan(NOW - 5 * 60_000);
  });

  it("menyiapkan hitung mundur iqamah", () => {
    const data = buildPreviewTvData(baseData(), config("iqamah"));

    expect(new Date(data.nextIqamah!.iqamahTarget).getTime()).toBeGreaterThan(NOW);
    expect(data.nextIqamah!.isBetweenAdhanAndIqamah).toBe(true);
  });

  it("menyiapkan khutbah Jumat tanpa menunggu Jumat", () => {
    const data = buildPreviewTvData(baseData(), config("khutbah"));

    expect(data.isFriday).toBe(true);
    expect(data.iqamahEvents[0].key).toBe("dhuhr");
    expect(data.khutbah).toBeNull();
  });
});
