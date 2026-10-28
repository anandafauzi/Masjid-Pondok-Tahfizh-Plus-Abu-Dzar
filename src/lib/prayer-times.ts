import { CalculationMethod, Coordinates, PrayerTimes, Madhab } from "adhan";
import { combineDateTime, dateOnlyToString, formatTZ, addMinutes } from "@/lib/datetime";
import { PRAYER_NAMES } from "@/utils/constants";

const MASJID_COORDS = {
  latitude: -6.442126,
  longitude: 106.640654,
};

export type PrayerKey =
  | "imsak"
  | "fajr"
  | "sunrise"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha";

export type PrayerTimesStrings = Record<PrayerKey, string>;

export interface PrayerOptions {
  method?: string;
  asrMethod?: string;
  adjustments?: Partial<Record<PrayerKey, number>> | null;
  latitude?: number;
  longitude?: number;
}

export const PRAYER_ORDER: Exclude<PrayerKey, "imsak" | "sunrise">[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
];

function getCalculationMethod(method: string) {
  switch (method) {
    case "KEMENAG":
    case "Kemenag":
    case "Indonesia":
    case "SIHAT": {
      // Standar Resmi Kementerian Agama Republik Indonesia (Kemenag RI):
      // Sudut Subuh 20°, Sudut Isya 18°, dengan standar pengaman waktu (ihtiyat) +2 menit.
      const params = CalculationMethod.Singapore();
      params.methodAdjustments = {
        dhuhr: 2,
        fajr: 2,
        sunrise: 0,
        asr: 2,
        maghrib: 2,
        isha: 2,
      };
      return params;
    }
    case "Singapore":
      return CalculationMethod.Singapore();
    case "ISNA":
      return CalculationMethod.NorthAmerica();
    case "Egypt":
      return CalculationMethod.Egyptian();
    case "Makkah":
      return CalculationMethod.UmmAlQura();
    case "Karachi":
      return CalculationMethod.Karachi();
    case "Tehran":
      return CalculationMethod.Tehran();
    case "Dubai":
      return CalculationMethod.Dubai();
    case "Turkey":
      return CalculationMethod.Turkey();
    case "MWL":
      return CalculationMethod.MuslimWorldLeague();
    default: {
      // Default untuk masjid di Indonesia adalah standar Kemenag RI
      const params = CalculationMethod.Singapore();
      params.methodAdjustments = {
        dhuhr: 2,
        fajr: 2,
        sunrise: 0,
        asr: 2,
        maghrib: 2,
        isha: 2,
      };
      return params;
    }
  }
}

function addAdjustment(date: Date, minutes: number | undefined) {
  if (!minutes) return date;
  return addMinutes(date, minutes);
}

export function calculatePrayerTimes(
  dateOnly: Date | string,
  options: PrayerOptions = {}
): PrayerTimesStrings {
  const ymd =
    typeof dateOnly === "string" ? dateOnly : dateOnlyToString(dateOnly);
  const [y, m, d] = ymd.split("-").map(Number);

  // adhan reads the Y/M/D from the Date's local components.
  const adhanDate = new Date(y, m - 1, d, 12, 0, 0);

  const coordinates = new Coordinates(
    options.latitude ?? MASJID_COORDS.latitude,
    options.longitude ?? MASJID_COORDS.longitude
  );

  const params = getCalculationMethod(options.method ?? "MWL");
  params.madhab =
    options.asrMethod === "HANAFI" ? Madhab.Hanafi : Madhab.Shafi;

  const times = new PrayerTimes(coordinates, adhanDate, params);
  const adj = options.adjustments ?? {};

  const fajr = addAdjustment(times.fajr, adj.fajr);

  return {
    imsak: formatTZ(addMinutes(fajr, -10), "HH:mm"),
    fajr: formatTZ(fajr, "HH:mm"),
    sunrise: formatTZ(addAdjustment(times.sunrise, adj.sunrise), "HH:mm"),
    dhuhr: formatTZ(addAdjustment(times.dhuhr, adj.dhuhr), "HH:mm"),
    asr: formatTZ(addAdjustment(times.asr, adj.asr), "HH:mm"),
    maghrib: formatTZ(addAdjustment(times.maghrib, adj.maghrib), "HH:mm"),
    isha: formatTZ(addAdjustment(times.isha, adj.isha), "HH:mm"),
  };
}

export interface NextPrayerInfo {
  key: Exclude<PrayerKey, "imsak" | "sunrise">;
  label: string;
  time: string;
  target: Date;
  tomorrow: boolean;
}

/**
 * Returns the next prayer (fajr/dhuhr/asr/maghrib/isha) with an absolute
 * target Date so countdowns never reset when the UI re-renders.
 */
export function getNextPrayer(
  prayerTimes: PrayerTimesStrings,
  dateOnly: Date,
  now: Date = new Date(),
  options: PrayerOptions = {}
): NextPrayerInfo {
  for (const key of PRAYER_ORDER) {
    const target = combineDateTime(dateOnly, prayerTimes[key]);
    if (target.getTime() > now.getTime()) {
      return {
        key,
        label: PRAYER_NAMES[key],
        time: prayerTimes[key],
        target,
        tomorrow: false,
      };
    }
  }

  const tomorrowDate = new Date(dateOnly);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  // Calculate tomorrow's times for an accurate fajr target.
  const tomorrowTimes = calculatePrayerTimes(tomorrowDate, options);
  const target = combineDateTime(tomorrowDate, tomorrowTimes.fajr);

  return {
    key: "fajr",
    label: PRAYER_NAMES.fajr,
    time: tomorrowTimes.fajr,
    target,
    tomorrow: true,
  };
}
