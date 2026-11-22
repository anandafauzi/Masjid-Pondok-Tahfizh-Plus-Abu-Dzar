import { prisma } from "@/lib/prisma";
import { MASJID_INFO, normalizePrayerName } from "@/utils/constants";
import type { IqamahSettingLike } from "@/lib/iqamah";
import { getPublicDataVersion } from "@/lib/public-cache";
import { DEFAULT_SHALAT_SCREEN_DURATION_MINUTES } from "@/lib/tv-display-settings";

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
  /**
   * Total durasi layar shalat sejak iqamah (menit). 60 detik pertama terang,
   * setelah itu meredup bertahap sampai durasi ini berakhir.
   */
  shalatScreenDurationMinutes?: number;
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

/**
 * Hanya field ini yang boleh ikut terkirim ke halaman publik/TV.
 * themeSettings di database juga menyimpan data internal (mis. daftar petugas
 * beserta nomor HP), yang tidak boleh bocor lewat endpoint publik.
 */
const PUBLIC_THEME_KEYS: Array<keyof TvThemeSettings> = [
  "showWeather",
  "weatherCity",
  "activePrayerGlow",
  "shalatScreenDurationMinutes",
  "specialAnnouncement",
];

function toPublicTheme(value: unknown): TvThemeSettings | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const theme: Record<string, unknown> = {};
  for (const key of PUBLIC_THEME_KEYS) {
    if (source[key] !== undefined) theme[key] = source[key];
  }
  return theme as TvThemeSettings;
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
    shalatScreenDurationMinutes: DEFAULT_SHALAT_SCREEN_DURATION_MINUTES,
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
  { prayerName: "Shubuh", mode: "DELAY_MINUTES", delayMinutes: 20, fixedIqamahTime: null },
  { prayerName: "Dzuhur", mode: "DELAY_MINUTES", delayMinutes: 15, fixedIqamahTime: null },
  { prayerName: "Ashar", mode: "DELAY_MINUTES", delayMinutes: 15, fixedIqamahTime: null },
  { prayerName: "Maghrib", mode: "DELAY_MINUTES", delayMinutes: 5, fixedIqamahTime: null },
  { prayerName: "Isya", mode: "DELAY_MINUTES", delayMinutes: 15, fixedIqamahTime: null },
];

/**
 * Cache in-memory singkat untuk pengaturan yang dibaca di hampir semua
 * halaman. Cache otomatis kedaluwarsa saat admin menyimpan perubahan
 * (lewat `invalidatePublicDataCache`) atau setelah TTL habis.
 */
const SETTINGS_TTL_MS = 30_000;
const settingsCache = new Map<
  string,
  { at: number; version: number; value: unknown }
>();

function readSettingsCache<T>(key: string): T | null {
  const entry = settingsCache.get(key);
  if (!entry) return null;
  if (entry.version !== getPublicDataVersion()) {
    settingsCache.delete(key);
    return null;
  }
  if (Date.now() - entry.at > SETTINGS_TTL_MS) {
    settingsCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function writeSettingsCache(key: string, value: unknown): void {
  settingsCache.set(key, {
    at: Date.now(),
    version: getPublicDataVersion(),
    value,
  });
}

export async function getMosqueSettings(): Promise<MosqueSettingsData> {
  // Cache singkat: pengaturan masjid dibaca hampir di semua halaman publik
  // dan TV. Tanpa cache, setiap request menambah satu query ke pooler yang
  // hanya punya satu koneksi.
  const cached = readSettingsCache<MosqueSettingsData>("mosque");
  if (cached) return cached;

  try {
    const settings = await prisma.mosqueSettings.findFirst({
      orderBy: { id: "asc" },
    });
    if (!settings) return DEFAULT_MOSQUE_SETTINGS;

    let adjustments: Record<string, number> | null = null;
    if (settings.prayerAdjustments && typeof settings.prayerAdjustments === "object") {
      adjustments = settings.prayerAdjustments as Record<string, number>;
    }

    const result: MosqueSettingsData = {
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
    writeSettingsCache("mosque", result);
    return result;
  } catch {
    return DEFAULT_MOSQUE_SETTINGS;
  }
}

export async function getDisplaySettings(): Promise<DisplaySettingsData> {
  const cached = readSettingsCache<DisplaySettingsData>("display");
  if (cached) return cached;

  try {
    const settings = await prisma.displaySetting.findFirst({
      orderBy: { id: "asc" },
    });
    if (!settings) return DEFAULT_DISPLAY_SETTINGS;

    const theme = toPublicTheme(settings.themeSettings);

    const result: DisplaySettingsData = {
      slideIntervalSeconds: settings.slideIntervalSeconds,
      autoRotateEnabled: settings.autoRotateEnabled,
      tickerSpeed: settings.tickerSpeed,
      tickerEnabled: settings.tickerEnabled,
      showHijriDate: settings.showHijriDate,
      themeSettings: theme ?? DEFAULT_DISPLAY_SETTINGS.themeSettings,
    };
    writeSettingsCache("display", result);
    return result;
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

/**
 * Simpan sebagian themeSettings tanpa menghapus key lain.
 * Merge terjadi di database (jsonb `||`), jadi dua admin yang menyimpan
 * fitur berbeda bersamaan tidak saling menimpa. Baris default dibuat bila
 * belum ada; ON CONFLICT menangani race saat baris pertama dibuat bareng.
 */
export async function saveDisplayThemePatch(
  patch: Record<string, unknown>
): Promise<void> {
  if (Object.keys(patch).length === 0) return;

  const patchJson = JSON.stringify(patch);
  await prisma.$executeRaw`
    WITH target AS (
      SELECT id FROM display_settings ORDER BY id ASC LIMIT 1
    ),
    ensure AS (
      INSERT INTO display_settings (id, "themeSettings", "updatedAt")
      SELECT 'default', ${patchJson}::jsonb, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM target)
      ON CONFLICT (id) DO UPDATE
        SET "themeSettings" =
              COALESCE(display_settings."themeSettings", '{}'::jsonb)
              || EXCLUDED."themeSettings",
            "updatedAt" = NOW()
    )
    UPDATE display_settings AS d
    SET "themeSettings" = COALESCE(d."themeSettings", '{}'::jsonb) || ${patchJson}::jsonb,
        "updatedAt" = NOW()
    FROM target
    WHERE d.id = target.id
  `;
}

export async function getIqamahSettings(): Promise<IqamahSettingLike[]> {
  const cached = readSettingsCache<IqamahSettingLike[]>("iqamah");
  if (cached) return cached;

  try {
    const settings = await prisma.iqamahSetting.findMany();
    if (settings.length === 0) return DEFAULT_IQAMAH_SETTINGS;

    // Data lama memakai "Subuh/Zuhur/Asar/Magrib". Normalisasi di sini supaya
    // satu shalat tidak terbaca dua kali bila row lama dan baru sama-sama ada.
    const byName = new Map<string, (typeof settings)[number]>();
    for (const stored of settings) {
      const name = normalizePrayerName(stored.prayerName);
      if (!DEFAULT_IQAMAH_SETTINGS.some((fallback) => fallback.prayerName === name)) {
        continue;
      }
      const existing = byName.get(name);
      if (!existing || stored.prayerName === name) byName.set(name, stored);
    }

    // Keep a deterministic order and fall back to sensible defaults when a
    // row is missing, instead of silently using a 0-minute delay.
    const result = DEFAULT_IQAMAH_SETTINGS.map((fallback) => {
      const stored = byName.get(fallback.prayerName);
      if (!stored) return fallback;
      return {
        prayerName: fallback.prayerName,
        mode: stored.mode,
        delayMinutes: stored.delayMinutes,
        fixedIqamahTime: stored.fixedIqamahTime,
      };
    });
    writeSettingsCache("iqamah", result);
    return result;
  } catch {
    return DEFAULT_IQAMAH_SETTINGS;
  }
}
