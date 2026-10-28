import { calculatePrayerTimes, getNextPrayer, PrayerTimesStrings } from "@/lib/prayer-times";
import { computeIqamahEvents, getNextIqamah } from "@/lib/iqamah";
import {
  getDisplaySettings,
  getIqamahSettings,
  getMosqueSettings,
} from "@/lib/settings";
import { getActiveKhutbah } from "@/lib/khutbah";
import { resolveRolling } from "@/lib/rolling";
import { dateOnlyToString, todayDateOnly } from "@/lib/datetime";
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
    address: string | null;
    mapUrl: string;
    calculationMethod: string;
  };
  today: string;
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
  const mosque = await getMosqueSettings();

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
  const iqamahSettings = await getIqamahSettings();
  const iqamahEvents = computeIqamahEvents(today, prayerTimes, iqamahSettings);
  const nextIqamah = getNextIqamah(iqamahEvents, now);

  const [
    imamToday,
    display,
    runningTexts,
    advice,
    kajian,
    khutbah,
    khatibUpcoming,
    khatibRolling,
    imamRolling,
  ] = await Promise.all([
    getImamSchedulesBetween(today, today),
    getDisplaySettings(),
    getRunningTextsSafe(),
    getAdviceSafe(),
    getKajianSafe(now, 5),
    getActiveKhutbah(now).catch(() => null),
    getUpcomingKhatibSchedules(today, 4),
    getKhatibRollingActive(),
    getImamRollingActive(),
  ]);

  const friday = nextFriday(today);
  const fridaySchedule = await getKhatibScheduleForDate(friday);

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

  return {
    serverTime: now.toISOString(),
    mosque: {
      name: mosque.mosqueName,
      address: mosque.address,
      mapUrl: mosque.mapUrl,
      calculationMethod: mosque.prayerCalculationMethod,
    },
    today: dateOnlyToString(today),
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
    })),
    nextIqamah: nextIqamah
      ? {
          label: nextIqamah.label,
          adhanTime: nextIqamah.adhanTime,
          iqamahTime: nextIqamah.iqamahTime,
          adhanTarget: nextIqamah.adhanTarget.toISOString(),
          iqamahTarget: nextIqamah.iqamahTarget.toISOString(),
          isBetweenAdhanAndIqamah: nextIqamah.isBetweenAdhanAndIqamah,
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
    khutbah: khutbah
      ? {
          id: khutbah.id,
          khatibName: khutbah.khatibName,
          sermonTopic: khutbah.sermonTopic,
          endsAt: khutbah.endsAt.toISOString(),
          startedAt: khutbah.startedAt.toISOString(),
        }
      : null,
  };
}
