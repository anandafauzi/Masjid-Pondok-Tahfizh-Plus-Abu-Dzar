"use client";

import type { TvData } from "@/lib/public-data";
import type { TvThemeSettings } from "@/lib/settings";
import {
  DEFAULT_SHALAT_SCREEN_DURATION_MINUTES,
  normalizeShalatScreenDurationMinutes,
} from "@/lib/tv-display-settings";

export const TV_PREVIEW_STORAGE_KEY = "masjid_tv_preview_config";

export const TV_PREVIEW_PHASES = [
  { id: "normal", label: "Normal" },
  { id: "iqamah", label: "Menuju Iqamah" },
  { id: "shalat-bright", label: "Shalat Terang" },
  { id: "shalat-dim", label: "Shalat Redup" },
  { id: "khutbah", label: "Khutbah Jumat" },
] as const;

export type TvPreviewPhase = (typeof TV_PREVIEW_PHASES)[number]["id"];

export interface TvPreviewForm {
  slideIntervalSeconds: number;
  autoRotateEnabled: boolean;
  tickerSpeed: number;
  tickerEnabled: boolean;
  showHijriDate: boolean;
  themeSettings?: TvThemeSettings | null;
}

export interface TvPreviewConfig {
  phase: TvPreviewPhase;
  form: TvPreviewForm;
  updatedAt: number;
}

export const DEFAULT_TV_PREVIEW_FORM: TvPreviewForm = {
  slideIntervalSeconds: 10,
  autoRotateEnabled: true,
  tickerSpeed: 50,
  tickerEnabled: true,
  showHijriDate: true,
  themeSettings: {
    showWeather: true,
    weatherCity: "Rumpin, Bogor",
    activePrayerGlow: true,
    shalatScreenDurationMinutes: DEFAULT_SHALAT_SCREEN_DURATION_MINUTES,
  },
};

export const DEFAULT_TV_PREVIEW_CONFIG: TvPreviewConfig = {
  phase: "shalat-bright",
  form: DEFAULT_TV_PREVIEW_FORM,
  updatedAt: 0,
};

export function readTvPreviewConfig(): TvPreviewConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TV_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TvPreviewConfig>;
    const phase = TV_PREVIEW_PHASES.some((item) => item.id === parsed.phase)
      ? (parsed.phase as TvPreviewPhase)
      : DEFAULT_TV_PREVIEW_CONFIG.phase;
    return {
      phase,
      form: {
        ...DEFAULT_TV_PREVIEW_FORM,
        ...(parsed.form ?? {}),
        themeSettings: {
          ...(DEFAULT_TV_PREVIEW_FORM.themeSettings ?? {}),
          ...(parsed.form?.themeSettings ?? {}),
        },
      },
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function writeTvPreviewConfig(config: TvPreviewConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TV_PREVIEW_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage bisa penuh/diblokir; pratinjau tetap bisa dipakai di tab ini.
  }
}

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

function toWibTime(ms: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(ms));
}

/**
 * Buat salinan data TV dengan waktu yang disetel sedemikian rupa sehingga
 * fase yang dipilih langsung aktif. Nilai form admin (yang belum disimpan)
 * juga dimasukkan supaya pratinjau benar-benar mencerminkan edit terbaru.
 */
export function buildPreviewTvData(
  base: TvData,
  config: TvPreviewConfig,
  frozenNow?: number,
): TvData {
  // Tanpa waktu yang dibekukan, phase pratinjau bergeser tiap render dan
  // overlay bisa tiba-tiba hilang setelah beberapa menit.
  const now = frozenNow ?? Date.now();
  const configuredDuration = normalizeShalatScreenDurationMinutes(
    config.form.themeSettings?.shalatScreenDurationMinutes,
  );
  // Durasi 1 menit tidak punya fase redup. Untuk pratinjau redup, pakai
  // minimal 2 menit agar efeknya tetap bisa dilihat.
  const durationMinutes =
    config.phase === "shalat-dim"
      ? Math.max(2, configuredDuration)
      : configuredDuration;
  const durationMs = durationMinutes * 60_000;

  const baseEvent =
    base.iqamahEvents?.find((event) => event.key === "maghrib") ??
    base.iqamahEvents?.[0];

  let isFriday = false;
  let eventKey = baseEvent?.key ?? "maghrib";
  let eventLabel = baseEvent?.label ?? "Maghrib";
  let adhanTarget = now - 5 * 60_000;
  let iqamahTarget = now + 2 * 60_000;

  switch (config.phase) {
    case "normal":
      adhanTarget = now - (durationMinutes + 10) * 60_000;
      iqamahTarget = now - (durationMinutes + 5) * 60_000;
      break;
    case "iqamah":
      adhanTarget = now - 3 * 60_000;
      iqamahTarget = now + 2 * 60_000;
      break;
    case "shalat-bright":
      adhanTarget = now - 5 * 60_000 - 30_000;
      iqamahTarget = now - 30_000;
      break;
    case "shalat-dim": {
      const dimOffset = Math.max(90_000, Math.floor(durationMs / 2));
      adhanTarget = now - 5 * 60_000 - dimOffset;
      iqamahTarget = now - dimOffset;
      break;
    }
    case "khutbah":
      isFriday = true;
      eventKey = "dhuhr";
      eventLabel = "Dzuhur";
      adhanTarget = now - 10 * 60_000;
      iqamahTarget = now + 30 * 60_000;
      break;
  }

  const previewEvent = {
    key: eventKey,
    label: eventLabel,
    adhanTime: toWibTime(adhanTarget),
    iqamahTime: toWibTime(iqamahTarget),
    adhanTarget: toIso(adhanTarget),
    iqamahTarget: toIso(iqamahTarget),
    mode: "DELAY_MINUTES",
    delayMinutes: 5,
    fixedIqamahTime: null,
  };

  const futureIqamah = {
    label: "Shubuh",
    adhanTime: toWibTime(now + 60 * 60_000),
    iqamahTime: toWibTime(now + 61 * 60_000),
    adhanTarget: toIso(now + 60 * 60_000),
    iqamahTarget: toIso(now + 61 * 60_000),
    isBetweenAdhanAndIqamah: false,
  };

  const usesLiveIqamah = config.phase === "iqamah";

  return {
    ...base,
    serverTime: toIso(now),
    isFriday,
    khutbah: null,
    iqamahEvents: [previewEvent],
    nextIqamah: usesLiveIqamah
      ? { ...previewEvent, isBetweenAdhanAndIqamah: true }
      : futureIqamah,
    nextPrayer: {
      key: eventKey,
      label: eventLabel,
      time: previewEvent.adhanTime,
      target: previewEvent.adhanTarget,
      tomorrow: false,
    },
    display: {
      ...base.display,
      ...config.form,
      themeSettings: {
        ...(base.display.themeSettings ?? {}),
        ...(config.form.themeSettings ?? {}),
        shalatScreenDurationMinutes: durationMinutes,
      },
    },
  };
}
