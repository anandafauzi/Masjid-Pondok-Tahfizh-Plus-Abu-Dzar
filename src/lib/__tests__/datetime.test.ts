import { describe, expect, it } from "vitest";
import {
  addDaysUTC,
  combineDateTime,
  dateOnlyToString,
  dateOnlyToUTC,
  nextFriday,
  toDateOnlyString,
  todayDateOnly,
} from "@/lib/datetime";

describe("datetime helpers", () => {
  it("dateOnlyToUTC creates UTC midnight", () => {
    const d = dateOnlyToUTC("2026-11-01");
    expect(d.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("dateOnlyToString reads UTC date correctly", () => {
    const d = new Date("2026-11-01T00:00:00.000Z");
    expect(dateOnlyToString(d)).toBe("2026-11-01");
  });

  it("addDaysUTC adds days in UTC", () => {
    const base = dateOnlyToUTC("2026-11-01");
    expect(dateOnlyToString(addDaysUTC(base, 7))).toBe("2026-11-08");
    expect(dateOnlyToString(addDaysUTC(base, -1))).toBe("2026-10-31");
  });

  it("nextFriday returns Friday of same or next week", () => {
    // Nov 1 2026 is a Sunday
    const sunday = dateOnlyToUTC("2026-11-01");
    const fri = nextFriday(sunday);
    expect(fri.getUTCDay()).toBe(5);
    expect(dateOnlyToString(fri)).toBe("2026-11-06");
  });

  it("combineDateTime builds WIB zoned time", () => {
    const d = dateOnlyToUTC("2026-11-01");
    const target = combineDateTime(d, "05:00");
    // 05:00 WIB = 22:00 UTC previous day
    expect(target.toISOString()).toBe("2026-10-31T22:00:00.000Z");
  });

  it("toDateOnlyString formats in Asia/Jakarta", () => {
    // 00:30 UTC = 07:30 WIB same day
    const d = new Date("2026-11-01T00:30:00.000Z");
    expect(toDateOnlyString(d)).toBe("2026-11-01");
  });

  it("todayDateOnly returns UTC midnight for current WIB date", () => {
    const t = todayDateOnly();
    expect(t.toISOString().endsWith("T00:00:00.000Z")).toBe(true);
  });
});
