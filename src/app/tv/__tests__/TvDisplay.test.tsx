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
      label: "Maghrib",
      time: "18:05",
      target: new Date(IQAMAH_MS - 5 * 60_000).toISOString(),
      tomorrow: false,
    },
    iqamahEvents: [
      {
        key: "maghrib",
        label: "Maghrib",
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
      label: "Maghrib",
      adhanTime: "18:05",
      iqamahTime: "18:10",
      adhanTarget: new Date(IQAMAH_MS - 5 * 60_000).toISOString(),
      iqamahTarget: new Date(IQAMAH_MS).toISOString(),
      tomorrow: false,
    },
    imamToday: [
      {
        prayerName: "Maghrib",
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
    expect(screen.queryByText(/Kembali ke slide normal dalam/)).toBeNull();
    expect(screen.queryByText(/\d{2}:\d{2}:\d{2}/)).toBeNull();
    expect(screen.getByText(/^\d{2}\.\d{2} WIB$/)).toBeTruthy();
    expect(
      screen.queryByText("Selesai Shalat / Kembali ke Slide Normal"),
    ).toBeNull();

    unmount();
  });

  it("tetap terang pada layar shalat yang sama sampai durasi berakhir", () => {
    const serverNow = IQAMAH_MS + 180_000;
    vi.spyOn(Date, "now").mockReturnValue(serverNow);
    const data = makeData(serverNow, 5);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) })),
    );

    const { container, unmount } = render(<TvDisplay initialData={data} />);

    // Tidak ada lapisan hitam / peredupan lagi; tampilan sama seperti fase terang.
    expect(container.querySelector('div[aria-hidden="true"].bg-black')).toBeNull();

    expect(
      screen.getByText("SHALAT BERJAMAAH SEDANG BERLANGSUNG"),
    ).toBeTruthy();
    expect(screen.queryByText(/Kembali ke slide normal dalam/)).toBeNull();
    expect(screen.queryByText(/\d{2}:\d{2}:\d{2}/)).toBeNull();
    expect(
      screen.queryByText("Selesai Shalat / Kembali ke Slide Normal"),
    ).toBeNull();

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
    expect(screen.queryByText(/Kembali ke slide normal dalam/)).toBeNull();
    expect(screen.queryByText(/\d{2}:\d{2}:\d{2}/)).toBeNull();
    expect(
      screen.queryByText("Selesai Shalat / Kembali ke Slide Normal"),
    ).toBeNull();

    unmount();
  });
});

describe("TvDisplay countdown menuju iqamah", () => {
  it("memakai satu layar penuh tanpa header logo, nama masjid, cuaca, dan jam", () => {
    const serverNow = IQAMAH_MS - 60_000;
    vi.spyOn(Date, "now").mockReturnValue(serverNow);
    const data = makeData(serverNow);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) })),
    );

    const { container, unmount } = render(<TvDisplay initialData={data} />);

    expect(container.querySelector("header")).toBeNull();
    expect(screen.getByText("MENUJU IQAMAH")).toBeTruthy();
    expect(screen.getByText("Sisa Waktu Menuju Iqamah")).toBeTruthy();

    unmount();
  });

  it("juga menyembunyikan header pada 10 detik pertama masuk waktu shalat", () => {
    const serverNow = IQAMAH_MS - 5 * 60_000 + 3_000;
    vi.spyOn(Date, "now").mockReturnValue(serverNow);
    const data = makeData(serverNow);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(data) })),
    );

    const { container, unmount } = render(<TvDisplay initialData={data} />);

    expect(container.querySelector("header")).toBeNull();
    expect(screen.getByText("WAKTU SHALAT TIBA")).toBeTruthy();

    unmount();
  });
});
