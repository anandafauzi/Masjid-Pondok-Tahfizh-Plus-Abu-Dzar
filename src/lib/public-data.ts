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
import { combineDateTime, dateOnlyToString, todayDateOnly } from "@/lib/datetime";
import {
  getAdviceSafe,
  getImamRollingActive,
  getImamSchedulesBetween,
  getKajianSafe,
  getKhatibRollingActive,
  getKhatibScheduleForDate,
  getRunningTextsSafe,
  getUpcomingKhatibSchedules,
  nextFriday,
} from "@/lib/schedule-data";

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
  prayerTimes: PrayerTimesStrings;
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

export async function buildTvData(): Promise<TvData> {
  const now = new Date();
  const today = todayDateOnly();
  const friday = nextFriday(today);

  // Concurrently fetch all database dependencies in parallel
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
    imamToday,
    fridaySchedule,
  ] = await Promise.all([
    getMosqueSettings(),
    getIqamahSettings(),
    getDisplaySettings(),
    getRunningTextsSafe(),
    getAdviceSafe(),
    getKajianSafe(now, 5),
    getActiveKhutbah(now).catch(() => null),
    getUpcomingKhatibSchedules(today, 4),
    getKhatibRollingActive(),
    getImamRollingActive(),
    getImamSchedulesBetween(today, today),
    getKhatibScheduleForDate(friday),
  ]);

  const prayerTimes = calculatePrayerTimes(today, {
    method: mosque.prayerCalculationMethod,
    asrMethod: mosque.asrMethod,
    adjustments: mosque.prayerAdjustments,
    latitude: mosque.latitude,
    longitude: mosque.longitude,
  });

  const nextPrayer = getNextPrayer(prayerTimes, today, now, {
    method: mosque.prayerCalculationMethod,
    asrMethod: mosque.asrMethod,
    adjustments: mosque.prayerAdjustments,
    latitude: mosque.latitude,
    longitude: mosque.longitude,
  });

  const iqamahEvents = computeIqamahEvents(today, prayerTimes, iqamahSettings);
  const nextIqamah = getNextIqamah(iqamahEvents, now);

  const rollingKhatib = resolveRolling(
    khatibRolling.map((r) => ({
      id: r.id,
      khatibName: r.khatibName,
      sequenceNumber: r.sequenceNumber,
      effectiveFrom: r.effectiveFrom,
      effectiveUntil: r.effectiveUntil,
      isActive: r.isActive,
      createdAt: r.createdAt,
    })),
    friday
  );

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
  const dhuhrEnd = new Date(dhuhrStart.getTime() + 40 * 60 * 1000); // 40 menit durasi Khutbah Jumat

  // Otomatis aktifkan mode Khutbah Jumat selama 40 menit di waktu sholat Jumat
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

  // Pada hari Jumat waktu Zuhur, sembunyikan countdown iqamah agar tidak tumpang tindih
  let resolvedNextIqamah = nextIqamah;
  if (isFridayToday && resolvedNextIqamah?.label?.toLowerCase().includes("zuhur")) {
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
    prayerTimes,
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
    jumat: {
      fridayDate: dateOnlyToString(friday),
      khatibName: fridaySchedule?.khatibName ?? rollingKhatib?.name ?? null,
      sermonTopic: fridaySchedule?.sermonTopic ?? null,
      imamSubuh: rollingImam?.name ?? null,
    },
    khatibUpcoming: khatibUpcoming.map((k) => ({
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
