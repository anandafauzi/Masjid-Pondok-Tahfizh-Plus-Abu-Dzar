import { TIMEZONE } from "@/lib/datetime";

const formatter = new Intl.DateTimeFormat(
  "en-u-ca-islamic-umalqura-nu-latn",
  { month: "numeric", timeZone: TIMEZONE }
);

/** true when the given instant falls in Ramadan (Islamic month 9) in WIB. */
export function isRamadan(date: Date = new Date()): boolean {
  const parts = formatter.formatToParts(date);
  return parts.find((part) => part.type === "month")?.value === "9";
}

/** true when a yyyy-MM-dd calendar date falls in Ramadan in WIB. */
export function isRamadanDate(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  return isRamadan(new Date(`${ymd}T12:00:00+07:00`));
}
