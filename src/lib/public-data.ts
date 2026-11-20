import { calculatePrayerTimes, getNextPrayer, PrayerTimesStrings } from "@/lib/prayer-times";
import { computeIqamahEvents, getNextIqamah } from "@/lib/iqamah";
import {
  getDisplaySettings,
  getIqamahSettings,
  getMosqueSettings,
  type TvThemeSettings,
} from "@/lib/settings";
import { getActiveKhutbah } from "@/lib/khutbah";
import { resolveRolling } from "@/lib/rolling";
import {
  addDaysUTC,
  combineDateTime,
  dateOnlyToString,
  todayDateOnly,
} from "@/lib/datetime";
import {
  getAdviceSafe,
  getImamRollingActive,
  getImamSchedulesBetween,
  getKajianSafe,
  getKhatibRollingActive,
  getKhatibScheduleForDate,
  getRunningTextsSafe,
  getTarawihSchedulesBetween,
  getUpcomingKhatibSchedules,
  nextFriday,
} from "@/lib/schedule-data";
import { getWeeklyImamSettings } from "@/lib/weekly-imam";
import { getPublicDataVersion } from "@/lib/public-cache";
import { isRamadan } from "@/lib/ramadan";

export interface TvData {
  serverTime: string;
  mosque: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    mapUrl: string;
    calculationMethod: string;
  };
  today: string;
  isFriday: boolean;
  isRamadan: boolean;
  tarawihToday: {
    id: string;
    imamName: string;
    imamName2: string | null;
    notes: string | null;
  } | null;
  prayerTimes: PrayerTimesStrings;
  prayerTimesWeek: Array<PrayerTimesStrings & { date: string }>;
  nextPrayer: {
    key: string;
    label: string;
    time: string;
    target: string;
    tomorrow: boolean;
  };
  iqamahEvents: Array<{
    key: string;
    label: string;
    adhanTime: string;
    iqamahTime: string;
    adhanTarget: string;
    iqamahTarget: string;
    mode: string;
    delayMinutes?: number;
    fixedIqamahTime?: string | null;
  }>;
  nextIqamah: {
    label: string;
    adhanTime: string;
    iqamahTime: string;
    adhanTarget: string;
    iqamahTarget: string;
    isBetweenAdhanAndIqamah: boolean;
  } | null;
  imamToday: Array<{
    id: string;
    prayerName: string;
    imamName: string;
    muadzinName: string;
  }>;
  imamWeek: Array<{
    date: string;
    id: string;
    prayerName: string;
    imamName: string;
    muadzinName: string;
  }>;
  imamTomorrowSubuh: {
    id: string;
    prayerName: string;
    imamName: string;
    muadzinName: string;
  } | null;
  jumat: {
    fridayDate: string;
    khatibName: string | null;
    sermonTopic: string | null;
    imamSubuh: string | null;
  };
  khatibUpcoming: Array<{
    id: string;
    fridayDate: string;
    khatibName: string;
    sermonTopic: string | null;
  }>;
  kajian: Array<{
    id: string;
    title: string;
    speakerName: string;
    bookOrTopic: string | null;
    startDateTime: string;
    location: string;
    kajianType: "REGULAR" | "LIBUR" | "KHUSUS";
    audience: string | null;
  }>;
  advice: Array<{
    id: string;
    content: string;
    sourceReference: string | null;
    authorOrSource: string | null;
  }>;
  runningTexts: Array<{ id: string; content: string }>;
  display: {
    slideIntervalSeconds: number;
    autoRotateEnabled: boolean;
    tickerSpeed: number;
    tickerEnabled: boolean;
    showHijriDate: boolean;
    themeSettings?: TvThemeSettings | null;
  };
  khutbah: {
    id: string;
    khatibName: string;
    sermonTopic: string | null;
    endsAt: string;
    startedAt: string;
  } | null;
}

export type PublicBundle = {
  mosque: Awaited<ReturnType<typeof getMosqueSettings>>;
  iqamahSettings: Awaited<ReturnType<typeof getIqamahSettings>>;
  display: Awaited<ReturnType<typeof getDisplaySettings>>;
  runningTexts: Awaited<ReturnType<typeof getRunningTextsSafe>>;
  advice: Awaited<ReturnType<typeof getAdviceSafe>>;
  kajian: Awaited<ReturnType<typeof getKajianSafe>>;
  khutbah: Awaited<ReturnType<typeof getActiveKhutbah>> | null;
  khatibUpcoming: Awaited<ReturnType<typeof getUpcomingKhatibSchedules>>;
  khatibRolling: Awaited<ReturnType<typeof getKhatibRollingActive>>;
  imamRolling: Awaited<ReturnType<typeof getImamRollingActive>>;
  weeklyImam: Awaited<ReturnType<typeof getWeeklyImamSettings>>;
  imamToday: Awaited<ReturnType<typeof getImamSchedulesBetween>>;
  imamWeek: Awaited<ReturnType<typeof getImamSchedulesBetween>>;
  imamTomorrow: Awaited<ReturnType<typeof getImamSchedulesBetween>>;
  tarawihToday: Awaited<ReturnType<typeof getTarawihSchedulesBetween>>[number] | null;
  isRamadan: boolean;
  fridaySchedule: Awaited<ReturnType<typeof getKhatibScheduleForDate>>;
};

// Data dasar (pengaturan, jadwal, kajian) jarang berubah. Cache singkat ini
// mencegah puluhan query database yang sama dijalankan ulang oleh setiap TV,
// taskbar mobile, dan halaman publik.
const BUNDLE_TTL_MS = 20_000;
// Jika pembacaan jadwal gagal sementara, pertahankan daftar petugas terakhir
// yang valid agar nama imam/muadzin tidak "hilang" lalu muncul lagi.
const IMAM_LAST_GOOD_TTL_MS = 6 * 60 * 60 * 1000;

// Cache dipisah per tanggal agar permintaan ?date= tidak saling menggusur
// cache halaman TV/beranda yang memakai tanggal hari ini.
const bundleCache = new Map<string, { at: number; bundle: PublicBundle }>();
const imamLastGood = new Map<
  string,
  { at: number; list: PublicBundle["imamToday"] }
>();

function cacheKey(version: number, ymd: string) {
  return `${version}:${ymd}`;
}

function pruneCache<T extends { at: number }>(
  cache: Map<string, T>,
  ttlMs: number,
  maxEntries: number
) {
  const cutoff = Date.now() - ttlMs;
  for (const [key, entry] of cache) {
    if (entry.at < cutoff) cache.delete(key);
  }
  while (cache.size > maxEntries) {
    let oldestKey: string | null = null;
    let oldestAt = Infinity;
    for (const [key, entry] of cache) {
      if (entry.at < oldestAt) {
        oldestKey = key;
        oldestAt = entry.at;
      }
    }
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

/**
 * Ambil paket data publik (pengaturan, jadwal imam hari ini, jadwal Jumat,
 * kajian, nasihat, teks berjalan) dengan cache singkat.
 *
 * Dipakai bersama oleh halaman beranda dan endpoint TV sehingga query yang
 * sama tidak dieksekusi berulang-ulang dalam satu waktu.
 */
export async function getPublicBundle(): Promise<PublicBundle> {
  const now = new Date();
  const today = todayDateOnly();
  return loadPublicBundle(now, today, nextFriday(today));
}

async function loadPublicBundle(
  now: Date,
  today: Date,
  friday: Date
): Promise<PublicBundle> {
  const ymd = dateOnlyToString(today);
  const tomorrow = addDaysUTC(today, 1);
  const tomorrowYmd = dateOnlyToString(tomorrow);
  const version = getPublicDataVersion();
  const key = cacheKey(version, ymd);

  pruneCache(bundleCache, BUNDLE_TTL_MS, 16);
  const cachedBundle = bundleCache.get(key);
  if (cachedBundle && Date.now() - cachedBundle.at < BUNDLE_TTL_MS) {
    return cachedBundle.bundle;
  }

  const [
    mosque,
    iqamahSettings,
    display,
    runningTexts,
    advice,
    kajian,
    khutbah,
    khatibUpcoming,
    khatibRolling,
    imamRolling,
    weeklyImam,
  ] = await Promise.all([
    getMosqueSettings(),
    getIqamahSettings(),
    getDisplaySettings(),
    getRunningTextsSafe(),
    getAdviceSafe(),
    getKajianSafe(now, 5),
    getActiveKhutbah(now).catch(() => null),
    getUpcomingKhatibSchedules(addDaysUTC(friday, 1), 4),
    getKhatibRollingActive(),
    getImamRollingActive(),
    getWeeklyImamSettings().catch(() => []),
  ]);

  const [imamTodayRaw, imamWeekRaw, imamTomorrowRaw, fridaySchedule, tarawihRows] =
    await Promise.all([
      getImamSchedulesBetween(today, today, {
        weeklyRules: weeklyImam,
        rollingImams: imamRolling,
      }),
      getImamSchedulesBetween(today, addDaysUTC(today, 6), {
        weeklyRules: weeklyImam,
        rollingImams: imamRolling,
      }),
      getImamSchedulesBetween(tomorrow, tomorrow, {
        weeklyRules: weeklyImam,
        rollingImams: imamRolling,
      }),
      getKhatibScheduleForDate(friday, khatibRolling),
      getTarawihSchedulesBetween(today, today),
    ]);

  const ramadanToday = isRamadan(today);

  pruneCache(imamLastGood, IMAM_LAST_GOOD_TTL_MS, 32);
  const imamKey = cacheKey(version, ymd);
  const imamTomorrowKey = cacheKey(version, tomorrowYmd);

  let imamToday = imamTodayRaw;
  if (imamToday.length === 0) {
    const cachedImam = imamLastGood.get(imamKey);
    if (cachedImam && Date.now() - cachedImam.at < IMAM_LAST_GOOD_TTL_MS) {
      imamToday = cachedImam.list;
    }
  } else {
    imamLastGood.set(imamKey, { at: Date.now(), list: imamToday });
  }

  let imamTomorrow = imamTomorrowRaw;
  if (imamTomorrow.length === 0) {
    const cachedImam = imamLastGood.get(imamTomorrowKey);
    if (cachedImam && Date.now() - cachedImam.at < IMAM_LAST_GOOD_TTL_MS) {
      imamTomorrow = cachedImam.list;
    }
  } else {
    imamLastGood.set(imamTomorrowKey, { at: Date.now(), list: imamTomorrow });
  }

  const bundle: PublicBundle = {
    mosque,
    iqamahSettings,
    display,
    runningTexts,
    advice,
    kajian,
    khutbah,
    khatibUpcoming,
    khatibRolling,
    imamRolling,
    weeklyImam,
    imamToday,
    imamWeek: imamWeekRaw,
    imamTomorrow,
    fridaySchedule,
    tarawihToday: ramadanToday ? (tarawihRows[0] ?? null) : null,
    isRamadan: ramadanToday,
  };

  bundleCache.set(key, { at: Date.now(), bundle });
  return bundle;
}

function parseRequestedDate(value: string | null | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return todayDateOnly();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return todayDateOnly();
  }
  return parsed;
}

export async function buildTvData(date?: string | null): Promise<TvData> {
  const now = new Date();
  const today = parseRequestedDate(date);
  const friday = nextFriday(today);

  const bundle = await loadPublicBundle(now, today, friday);
  const {
    mosque,
    iqamahSettings,
    display,
    runningTexts,
    advice,
    kajian,
    khutbah,
    khatibUpcoming,
    khatibRolling,
    imamRolling,
    imamToday,
    imamWeek,
    imamTomorrow,
    fridaySchedule,
    tarawihToday,
    isRamadan: ramadanToday,
  } = bundle;

  const imamTomorrowSubuh =
    imamTomorrow.find((s) => s.prayerName.toLowerCase() === "subuh") ?? null;

  const prayerOptions = {
    method: mosque.prayerCalculationMethod,
    asrMethod: mosque.asrMethod,
    adjustments: mosque.prayerAdjustments,
    latitude: mosque.latitude,
    longitude: mosque.longitude,
  };

  const prayerTimes = calculatePrayerTimes(today, prayerOptions);

  const prayerTimesWeek = Array.from({ length: 7 }, (_, index) => {
    const day = addDaysUTC(today, index);
    return {
      date: dateOnlyToString(day),
      ...calculatePrayerTimes(day, prayerOptions),
    };
  });

  const nextPrayer = getNextPrayer(prayerTimes, today, now, prayerOptions);

  const iqamahEvents = computeIqamahEvents(today, prayerTimes, iqamahSettings);
  const nextIqamah = getNextIqamah(iqamahEvents, now);

  const rollingKhatibSettings = khatibRolling.map((r) => ({
    id: r.id,
    khatibName: r.khatibName,
    sequenceNumber: r.sequenceNumber,
    effectiveFrom: r.effectiveFrom,
    effectiveUntil: r.effectiveUntil,
    isActive: r.isActive,
    createdAt: r.createdAt,
  }));
  const rollingKhatib = resolveRolling(rollingKhatibSettings, friday);

  // Jadwal khatib eksplisit sering hanya terisi sampai Jumat berjalan.
  // Untuk 4 Jumat ke depan, lengkapi dari pola rolling agar nama tetap tampil.
  const explicitKhatibByDate = new Map(
    khatibUpcoming.map((k) => [dateOnlyToString(k.fridayDate), k] as const)
  );
  const resolvedKhatibUpcoming = Array.from({ length: 4 }, (_, index) => {
    const date = addDaysUTC(friday, (index + 1) * 7);
    const ymd = dateOnlyToString(date);
    const explicit = explicitKhatibByDate.get(ymd);
    if (explicit && explicit.khatibName?.trim()) return explicit;
    const rolling = resolveRolling(rollingKhatibSettings, date);
    return {
      id: `rolling-${ymd}`,
      fridayDate: date,
      khatibName: rolling?.name?.trim() || "Belum dijadwalkan",
      sermonTopic: null,
    };
  });

  const rollingImam = resolveRolling(
    imamRolling.map((r) => ({
      id: r.id,
      imamName: r.imamName,
      sequenceNumber: r.sequenceNumber,
      effectiveFrom: r.effectiveFrom,
      effectiveUntil: r.effectiveUntil,
      isActive: r.isActive,
      createdAt: r.createdAt,
    })),
    friday
  );

  const isFridayToday = today.getUTCDay() === 5;
  const dhuhrStart = combineDateTime(today, prayerTimes.dhuhr);

  // Jika ada sesi khutbah dari database, gunakan endsAt sesi tersebut.
  // Jika tidak ada, gunakan durasi default 40 menit dari adzan Zuhur.
  const dhuhrEnd = khutbah
    ? new Date(khutbah.endsAt)
    : new Date(dhuhrStart.getTime() + 40 * 60 * 1000);

  // Otomatis aktifkan mode Khutbah Jumat selama window shalat Jumat
  let resolvedKhutbah = khutbah;
  if (!resolvedKhutbah && isFridayToday && now >= dhuhrStart && now < dhuhrEnd) {
    resolvedKhutbah = {
      id: `friday-auto-${dateOnlyToString(today)}`,
      khatibName: fridaySchedule?.khatibName ?? rollingKhatib?.name ?? "Khatib Jumat",
      sermonTopic: fridaySchedule?.sermonTopic ?? null,
      startedAt: dhuhrStart,
      endsAt: dhuhrEnd,
    } as typeof khutbah;
  }

  // Pada hari Jumat, sembunyikan countdown iqamah Zuhur HANYA saat window Khutbah Jumat aktif
  let resolvedNextIqamah = nextIqamah;
  const isKhutbahActiveNow = Boolean(
    isFridayToday && (resolvedKhutbah || (now >= dhuhrStart && now < dhuhrEnd))
  );
  if (isKhutbahActiveNow && resolvedNextIqamah?.label?.toLowerCase().includes("zuhur")) {
    resolvedNextIqamah = null;
  }

  return {
    serverTime: now.toISOString(),
    mosque: {
      name: mosque.mosqueName,
      logoUrl: (mosque as { logoUrl?: string | null }).logoUrl ?? null,
      address: mosque.address,
      mapUrl: mosque.mapUrl,
      calculationMethod: mosque.prayerCalculationMethod,
    },
    today: dateOnlyToString(today),
    isFriday: isFridayToday,
    isRamadan: ramadanToday,
    tarawihToday: tarawihToday
      ? {
          id: tarawihToday.id,
          imamName: tarawihToday.imamName,
          imamName2: tarawihToday.imamName2,
          notes: tarawihToday.notes,
        }
      : null,
    prayerTimes,
    prayerTimesWeek,
    nextPrayer: {
      key: nextPrayer.key,
      label: nextPrayer.label,
      time: nextPrayer.time,
      target: nextPrayer.target.toISOString(),
      tomorrow: nextPrayer.tomorrow,
    },
    iqamahEvents: iqamahEvents.map((e) => ({
      key: e.key,
      label: e.label,
      adhanTime: e.adhanTime,
      iqamahTime: e.iqamahTime,
      adhanTarget: e.adhanTarget.toISOString(),
      iqamahTarget: e.iqamahTarget.toISOString(),
      mode: e.mode,
      delayMinutes: e.delayMinutes,
      fixedIqamahTime: e.fixedIqamahTime,
    })),
    nextIqamah: resolvedNextIqamah
      ? {
          label: resolvedNextIqamah.label,
          adhanTime: resolvedNextIqamah.adhanTime,
          iqamahTime: resolvedNextIqamah.iqamahTime,
          adhanTarget: resolvedNextIqamah.adhanTarget.toISOString(),
          iqamahTarget: resolvedNextIqamah.iqamahTarget.toISOString(),
          isBetweenAdhanAndIqamah: resolvedNextIqamah.isBetweenAdhanAndIqamah,
        }
      : null,
    imamToday: imamToday.map((s) => ({
      id: s.id,
      prayerName: s.prayerName,
      imamName: s.imamName,
      muadzinName: s.muadzinName,
    })),
    imamWeek: imamWeek.map((s) => ({
      date: dateOnlyToString(s.scheduleDate),
      id: s.id,
      prayerName: s.prayerName,
      imamName: s.imamName,
      muadzinName: s.muadzinName,
    })),
    imamTomorrowSubuh: imamTomorrowSubuh
      ? {
          id: imamTomorrowSubuh.id,
          prayerName: imamTomorrowSubuh.prayerName,
          imamName: imamTomorrowSubuh.imamName,
          muadzinName: imamTomorrowSubuh.muadzinName,
        }
      : null,
    jumat: {
      fridayDate: dateOnlyToString(friday),
      khatibName: fridaySchedule?.khatibName ?? rollingKhatib?.name ?? null,
      sermonTopic: fridaySchedule?.sermonTopic ?? null,
      imamSubuh: rollingImam?.name ?? null,
    },
    khatibUpcoming: resolvedKhatibUpcoming
      .filter(
        (k, index, all) =>
          all.findIndex(
            (other) =>
              dateOnlyToString(other.fridayDate) === dateOnlyToString(k.fridayDate)
          ) === index
      )
      .map((k) => ({
        id: k.id,
        fridayDate: dateOnlyToString(k.fridayDate),
        khatibName: k.khatibName,
        sermonTopic: k.sermonTopic,
      })),
    kajian: kajian.map((k) => ({
      id: k.id,
      title: k.title,
      speakerName: k.speakerName,
      bookOrTopic: k.bookOrTopic,
      startDateTime: k.startDateTime.toISOString(),
      location: k.location,
      kajianType: k.kajianType,
      audience: k.audience,
    })),
    advice: advice.map((a) => ({
      id: a.id,
      content: a.content,
      sourceReference: a.sourceReference,
      authorOrSource: a.authorOrSource,
    })),
    runningTexts: runningTexts.map((r) => ({ id: r.id, content: r.content })),
    display,
    khutbah: resolvedKhutbah
      ? {
          id: resolvedKhutbah.id,
          khatibName: resolvedKhutbah.khatibName,
          sermonTopic: resolvedKhutbah.sermonTopic,
          endsAt: resolvedKhutbah.endsAt.toISOString(),
          startedAt: resolvedKhutbah.startedAt.toISOString(),
        }
      : null,
  };
}
