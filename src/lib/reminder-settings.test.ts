import { describe, expect, it } from "vitest";
import { dateOnlyToString } from "@/lib/datetime";
import {
  DEFAULT_REMINDER_SETTINGS,
  normalizeReminderSettings,
  resolveReminderTargetDate,
} from "@/lib/reminder-settings";

describe("normalizeReminderSettings", () => {
  it("memakai nilai default bila pengaturan kosong atau rusak", () => {
    expect(normalizeReminderSettings(null)).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(normalizeReminderSettings({ offsetDays: "abc", sendTime: 8 })).toEqual(
      DEFAULT_REMINDER_SETTINGS
    );
  });

  it("membatasi H- ke rentang 0..30 dan membulatkan bilangan", () => {
    expect(normalizeReminderSettings({ offsetDays: -5 }).offsetDays).toBe(0);
    expect(normalizeReminderSettings({ offsetDays: 99 }).offsetDays).toBe(30);
    expect(normalizeReminderSettings({ offsetDays: "2.6" }).offsetDays).toBe(3);
    expect(normalizeReminderSettings({ offsetDays: 0 }).offsetDays).toBe(0);
  });

  it("hanya menerima jam WIB HH:mm yang valid", () => {
    expect(normalizeReminderSettings({ sendTime: "08:30" }).sendTime).toBe("08:30");
    expect(normalizeReminderSettings({ sendTime: "23:59" }).sendTime).toBe("23:59");
    expect(normalizeReminderSettings({ sendTime: "25:00" }).sendTime).toBe(
      DEFAULT_REMINDER_SETTINGS.sendTime
    );
    expect(normalizeReminderSettings({ sendTime: "8:30" }).sendTime).toBe(
      DEFAULT_REMINDER_SETTINGS.sendTime
    );
  });

  it("menyimpan template imam dan khatib secara terpisah", () => {
    const result = normalizeReminderSettings({
      imamTemplate: "  Template imam {nama}  ",
      khatibTemplate: "Template khatib {nama}",
    });
    expect(result.imamTemplate).toBe("Template imam {nama}");
    expect(result.khatibTemplate).toBe("Template khatib {nama}");
    expect(result.imamTemplate).not.toBe(result.khatibTemplate);

    expect(
      normalizeReminderSettings({ imamTemplate: "   ", khatibTemplate: "" }).imamTemplate
    ).toBe(DEFAULT_REMINDER_SETTINGS.imamTemplate);
  });
});

describe("resolveReminderTargetDate", () => {
  const settings = {
    ...DEFAULT_REMINDER_SETTINGS,
    offsetDays: 1,
    sendTime: "08:00",
  };

  it("menargetkan tanggal sesuai offset bila cron berjalan setelah jam kirim", () => {
    // 08:30 WIB = 01:30 UTC.
    const target = resolveReminderTargetDate(new Date("2026-11-18T01:30:00.000Z"), settings);
    expect(dateOnlyToString(target)).toBe("2026-11-19");
  });

  it("menargetkan satu hari lebih awal bila cron berjalan sebelum jam kirim", () => {
    // 07:30 WIB = 00:30 UTC.
    const target = resolveReminderTargetDate(new Date("2026-11-18T00:30:00.000Z"), settings);
    expect(dateOnlyToString(target)).toBe("2026-11-18");
  });

  it("menganggap tepat pada jam kirim sebagai setelahnya", () => {
    const target = resolveReminderTargetDate(new Date("2026-11-18T01:00:00.000Z"), settings);
    expect(dateOnlyToString(target)).toBe("2026-11-19");
  });

  it("mengikuti offset berapa pun yang dipilih admin", () => {
    const target = resolveReminderTargetDate(new Date("2026-11-18T02:00:00.000Z"), {
      ...settings,
      offsetDays: 3,
      sendTime: "09:00",
    });
    expect(dateOnlyToString(target)).toBe("2026-11-21");
  });

  it("mendukung pengiriman pada hari H", () => {
    const target = resolveReminderTargetDate(new Date("2026-11-18T01:30:00.000Z"), {
      ...settings,
      offsetDays: 0,
    });
    expect(dateOnlyToString(target)).toBe("2026-11-18");
  });

  it("tidak mundur ke kemarin untuk offset 0 sebelum jam kirim", () => {
    // 07:00 WIB = 00:00 UTC, sedangkan jadwal kirim 16:00 WIB.
    const target = resolveReminderTargetDate(new Date("2026-11-18T00:00:00.000Z"), {
      ...settings,
      offsetDays: 0,
      sendTime: "16:00",
    });
    expect(dateOnlyToString(target)).toBe("2026-11-18");
  });
});
