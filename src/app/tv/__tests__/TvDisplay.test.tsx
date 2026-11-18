import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TvDisplay } from "@/app/tv/TvDisplay";
import type { TvData } from "@/lib/public-data";
import {
  DEFAULT_TV_PREVIEW_CONFIG,
  buildPreviewTvData,
} from "@/lib/tv-preview";

const IQAMAH_MS = Date.parse("2026-11-18T18:10:00+07:00");

function makeData(serverNow: number, durationMinutes = 5): TvData {
  return {
    serverTime: new Date(serverNow).toISOString(),
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
    prayerTimes: {
      imsak: "17:00",
      fajr: "17:10",
      sunrise: "18:00",
      dhuhr: "12:00",
      asr: "15:00",
      maghrib: "18:05",
      isha: "19:00",
    },
    nextPrayer: {
      key: "maghrib",
      label: "Magrib",
      time: "18:05",
      target: new Date(IQAMAH_MS - 5 * 60_000).toISOString(),
      tomorrow: false,
    },
    iqamahEvents: [
      {
        key: "maghrib",
        label: "Magrib",
        adhanTime: "18:05",
        iqamahTime: "18:10",
        adhanTarget: new Date(IQAMAH_MS - 5 * 60_000).toISOString(),
        iqamahTarget: new Date(IQAMAH_MS).toISOString(),
        mode: "DELAY_MINUTES",
        delayMinutes: 5,
        fixedIqamahTime: null,
      },
    ],
    nextIqamah: {
      label: "Magrib",
      adhanTime: "18:05",
      iqamahTime: "18:10",
      adhanTarget: new Date(IQAMAH_MS - 5 * 60_000).toISOString(),
      iqamahTarget: new Date(IQAMAH_MS).toISOString(),
      tomorrow: false,
    },
    imamToday: [
      {
        prayerName: "Magrib",
        imamName: "Ustadz Uji",
        muadzinName: "Muadzin Uji",
      },
    ],
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
      showHijriDate: false,
      themeSettings: {
        showWeather: false,
        activePrayerGlow: false,
        shalatScreenDurationMinutes: durationMinutes,
      },
    },
    khutbah: null,
  } as unknown as TvData;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TvDisplay layar shalat", () => {
  it("memakai satu layar yang sama pada 60 detik pertama", () => {
    const serverNow = IQAMAH_MS + 30_000;
    vi.spyOn(Date, "now").mockReturnValue(serverNow);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(makeData(serverNow)) }),
      ),
    );

    const { unmount } = render(<TvDisplay initialData={makeData(serverNow)} />);

    expect(screen.getByText("Luruskan & Rapatkan Shaf")).toBeTruthy();
    expect(screen.getByText(/Kembali ke slide normal dalam/)).toBeTruthy();
    expect(
      screen.getByText("Selesai Shalat / Kembali ke Slide Normal"),
    ).toBeTruthy();

    unmount();
  });

  it("meredup bertahap pada layar shalat yang sama", () => {
    const serverNow = IQAMAH_MS + 180_000;
    vi.spyOn(Date, "now").mockReturnValue(serverNow);
    const data = makeData(serverNow, 5);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) })),
    );

    const { container, unmount } = render(<TvDisplay initialData={data} />);

    // Durasi 5 menit => 4 menit fase redup. Pada menit ke-3, redup 50%.
    const veil = container.querySelector('div[aria-hidden="true"].bg-black');
    expect(veil).not.toBeNull();
    expect(Number((veil as HTMLElement).style.opacity)).toBeCloseTo(0.475, 3);

    expect(
      screen.getByText("SHALAT BERJAMAAH SEDANG BERLANGSUNG"),
    ).toBeTruthy();
    expect(screen.getByText(/Kembali ke slide normal dalam/)).toBeTruthy();

    unmount();
  });

  it("langsung menampilkan pratinjau shalat terang tanpa menunggu iqamah asli", () => {
    const serverNow = IQAMAH_MS;
    vi.spyOn(Date, "now").mockReturnValue(serverNow);
    const base = makeData(serverNow, 5);
    const previewData = buildPreviewTvData(base, {
      ...DEFAULT_TV_PREVIEW_CONFIG,
      phase: "shalat-bright",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve(previewData) }),
      ),
    );

    const { unmount } = render(
      <TvDisplay initialData={previewData} previewMode />,
    );

    expect(screen.getByText("Luruskan & Rapatkan Shaf")).toBeTruthy();
    expect(screen.getByText(/Kembali ke slide normal dalam/)).toBeTruthy();

    unmount();
  });
});
