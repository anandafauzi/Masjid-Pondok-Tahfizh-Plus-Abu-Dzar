import { PrayerKey, PrayerTimesStrings, PRAYER_ORDER } from "@/lib/prayer-times";
import { addMinutes, combineDateTime } from "@/lib/datetime";
import { PRAYER_NAMES } from "@/utils/constants";

export interface IqamahSettingLike {
  prayerName: string;
  mode: "DELAY_MINUTES" | "FIXED_TIME";
  delayMinutes: number;
  fixedIqamahTime: string | null;
}

export interface IqamahEvent {
  key: Exclude<PrayerKey, "imsak" | "sunrise">;
  label: string;
  adhanTime: string;
  iqamahTime: string;
  adhanTarget: Date;
  iqamahTarget: Date;
  mode: "DELAY_MINUTES" | "FIXED_TIME";
}

export function computeIqamahEvents(
  dateOnly: Date,
  prayerTimes: PrayerTimesStrings,
  settings: IqamahSettingLike[]
): IqamahEvent[] {
  const events: IqamahEvent[] = [];

  for (const key of PRAYER_ORDER) {
    const label = PRAYER_NAMES[key];
    const setting = settings.find((s) => s.prayerName === label);
    const adhanTime = prayerTimes[key];
    const adhanTarget = combineDateTime(dateOnly, adhanTime);

    let iqamahTarget: Date;
    let mode: "DELAY_MINUTES" | "FIXED_TIME" = "DELAY_MINUTES";

    if (setting?.mode === "FIXED_TIME" && setting.fixedIqamahTime) {
      mode = "FIXED_TIME";
      iqamahTarget = combineDateTime(dateOnly, setting.fixedIqamahTime);
    } else {
      iqamahTarget = addMinutes(adhanTarget, setting?.delayMinutes ?? 0);
    }

    events.push({
      key,
      label,
      adhanTime,
      iqamahTime: formatEventTime(iqamahTarget),
      adhanTarget,
      iqamahTarget,
      mode,
    });
  }

  return events.sort(
    (a, b) => a.iqamahTarget.getTime() - b.iqamahTarget.getTime()
  );
}

function formatEventTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export interface NextIqamahInfo extends IqamahEvent {
  isBetweenAdhanAndIqamah: boolean;
}

export function getNextIqamah(
  events: IqamahEvent[],
  now: Date = new Date()
): NextIqamahInfo | null {
  for (const event of events) {
    if (event.iqamahTarget.getTime() > now.getTime()) {
      return {
        ...event,
        isBetweenAdhanAndIqamah: event.adhanTarget.getTime() <= now.getTime(),
      };
    }
  }
  return null;
}
