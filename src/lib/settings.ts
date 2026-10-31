import { prisma } from "@/lib/prisma";
import { MASJID_INFO } from "@/utils/constants";
import type { IqamahSettingLike } from "@/lib/iqamah";

export interface MosqueSettingsData {
  mosqueName: string;
  logoUrl: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  mapUrl: string;
  prayerCalculationMethod: string;
  asrMethod: string;
  prayerAdjustments: Record<string, number> | null;
}

export interface SpecialAnnouncement {
  enabled: boolean;
  type: "duka" | "kajian" | "tarawih" | "umum";
  title: string;
  subtitle?: string;
  personName?: string;
  details?: string;
  notes?: string;
}

export interface TvThemeSettings {
  showWeather?: boolean;
  weatherCity?: string;
  activePrayerGlow?: boolean;
  specialAnnouncement?: SpecialAnnouncement;
}

export interface DisplaySettingsData {
  slideIntervalSeconds: number;
  autoRotateEnabled: boolean;
  tickerSpeed: number;
  tickerEnabled: boolean;
  showHijriDate: boolean;
  themeSettings?: TvThemeSettings | null;
}

export const DEFAULT_MOSQUE_SETTINGS: MosqueSettingsData = {
  mosqueName: MASJID_INFO.name,
  logoUrl: "/logo-masjid.png",
  address: MASJID_INFO.address,
  latitude: MASJID_INFO.latitude,
  longitude: MASJID_INFO.longitude,
  timezone: MASJID_INFO.timezone,
  mapUrl: MASJID_INFO.mapUrl,
  prayerCalculationMethod: "MWL",
  asrMethod: "STANDARD",
  prayerAdjustments: null,
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettingsData = {
  slideIntervalSeconds: 10,
  autoRotateEnabled: true,
  tickerSpeed: 50,
  tickerEnabled: true,
  showHijriDate: true,
  themeSettings: {
    showWeather: true,
    weatherCity: "Rumpin, Bogor",
    activePrayerGlow: true,
    specialAnnouncement: {
      enabled: false,
      type: "duka",
      title: "Inna lillahi wa inna ilayhi raji'un",
      subtitle: "Telah berpulang ke Rahmatullah",
      personName: "",
      details: "",
      notes: "Semoga Allah mengampuni segala dosa almarhum/almarhumah dan menempatkannya di tempat terbaik.",
    },
  },
};

export const DEFAULT_IQAMAH_SETTINGS: IqamahSettingLike[] = [
  { prayerName: "Subuh", mode: "DELAY_MINUTES", delayMinutes: 20, fixedIqamahTime: null },
  { prayerName: "Zuhur", mode: "DELAY_MINUTES", delayMinutes: 15, fixedIqamahTime: null },
  { prayerName: "Asar", mode: "DELAY_MINUTES", delayMinutes: 15, fixedIqamahTime: null },
  { prayerName: "Magrib", mode: "DELAY_MINUTES", delayMinutes: 5, fixedIqamahTime: null },
  { prayerName: "Isya", mode: "DELAY_MINUTES", delayMinutes: 15, fixedIqamahTime: null },
];

export async function getMosqueSettings(): Promise<MosqueSettingsData> {
  try {
    const settings = await prisma.mosqueSettings.findFirst();
    if (!settings) return DEFAULT_MOSQUE_SETTINGS;

    let adjustments: Record<string, number> | null = null;
    if (settings.prayerAdjustments && typeof settings.prayerAdjustments === "object") {
      adjustments = settings.prayerAdjustments as Record<string, number>;
    }

    return {
      mosqueName: settings.mosqueName,
      logoUrl: settings.logoUrl ?? null,
      address: settings.address,
      latitude: settings.latitude,
      longitude: settings.longitude,
      timezone: settings.timezone,
      mapUrl: settings.mapUrl,
      prayerCalculationMethod: settings.prayerCalculationMethod,
      asrMethod: settings.asrMethod,
      prayerAdjustments: adjustments,
    };
  } catch {
    return DEFAULT_MOSQUE_SETTINGS;
  }
}

export async function getDisplaySettings(): Promise<DisplaySettingsData> {
  try {
    const settings = await prisma.displaySetting.findFirst();
    if (!settings) return DEFAULT_DISPLAY_SETTINGS;

    let theme: TvThemeSettings | null = null;
    if (settings.themeSettings && typeof settings.themeSettings === "object") {
      theme = settings.themeSettings as unknown as TvThemeSettings;
    }

    return {
      slideIntervalSeconds: settings.slideIntervalSeconds,
      autoRotateEnabled: settings.autoRotateEnabled,
      tickerSpeed: settings.tickerSpeed,
      tickerEnabled: settings.tickerEnabled,
      showHijriDate: settings.showHijriDate,
      themeSettings: theme ?? DEFAULT_DISPLAY_SETTINGS.themeSettings,
    };
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

export async function getIqamahSettings(): Promise<IqamahSettingLike[]> {
  try {
    const settings = await prisma.iqamahSetting.findMany();
    if (settings.length === 0) return DEFAULT_IQAMAH_SETTINGS;

    const byName = new Map(settings.map((s) => [s.prayerName, s]));

    // Keep a deterministic order and fall back to sensible defaults when a
    // row is missing, instead of silently using a 0-minute delay.
    return DEFAULT_IQAMAH_SETTINGS.map((fallback) => {
      const stored = byName.get(fallback.prayerName);
      if (!stored) return fallback;
      return {
        prayerName: stored.prayerName,
        mode: stored.mode,
        delayMinutes: stored.delayMinutes,
        fixedIqamahTime: stored.fixedIqamahTime,
      };
    });
  } catch {
    return DEFAULT_IQAMAH_SETTINGS;
  }
}
