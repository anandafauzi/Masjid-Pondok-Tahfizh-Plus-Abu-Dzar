import { describe, expect, it } from "vitest";
import {
  addWeeksWib,
  buildKajianOccurrences,
  generateKajianOccurrences,
  weekdayLabel,
  weekdayWib,
  ymdWib,
  type KajianExceptionLike,
  type KajianRowLike,
} from "@/lib/kajian";

/** Rabu, 7 Januari 2026 pukul 18:00 WIB. */
const FIRST_START = new Date("2026-01-07T11:00:00.000Z");
const FIRST_END = new Date("2026-01-07T13:00:00.000Z");

function schedule(overrides: Partial<KajianRowLike> = {}): KajianRowLike {
  return {
    id: "kajian-1",
    title: "Kajian Tafsir",
    speakerName: "Ust. Ahmad",
    bookOrTopic: "Tafsir Jalalain",
    startDateTime: FIRST_START,
    endDateTime: FIRST_END,
    location: "Masjid",
    description: null,
    isActive: true,
    isRecurring: true,
    recurrenceDay: 3, // Rabu
    recurrenceUntil: null,
    rescheduledFrom: null,
    ...overrides,
  };
}

function exception(
  overrides: Partial<KajianExceptionLike> = {}
): KajianExceptionLike {
  return {
    kajianId: "kajian-1",
    occurrenceDate: new Date("2026-01-14T00:00:00.000Z"),
    newStartDateTime: new Date("2026-01-16T11:00:00.000Z"),
    newEndDateTime: null,
    note: null,
    ...overrides,
  };
}

describe("helper tanggal WIB", () => {
  it("mengenali hari dan tanggal menurut kalender WIB", () => {
    expect(weekdayWib(FIRST_START)).toBe(3);
    expect(weekdayLabel(3)).toBe("Rabu");
    expect(weekdayLabel(null)).toBe("-");
    expect(ymdWib(FIRST_START)).toBe("2026-01-07");
  });

  it("menambah pekan tanpa menggeser jam dinding WIB", () => {
    const next = addWeeksWib(FIRST_START, 1);
    expect(next.toISOString()).toBe("2026-01-14T11:00:00.000Z");
  });
});

describe("generateKajianOccurrences", () => {
  it("membuat pertemuan mingguan dengan jam yang sama", () => {
    const result = generateKajianOccurrences(
      schedule(),
      [],
      new Date("2026-01-01T00:00:00.000Z"),
      { maxOccurrences: 3 }
    );

    expect(result.map((item) => item.occurrenceDate)).toEqual([
      "2026-01-07",
      "2026-01-14",
      "2026-01-21",
    ]);
    expect(result.map((item) => item.startDateTime.toISOString())).toEqual([
      "2026-01-07T11:00:00.000Z",
      "2026-01-14T11:00:00.000Z",
      "2026-01-21T11:00:00.000Z",
    ]);
    expect(result[0].id).toBe("kajian-1@2026-01-07");
    expect(result.every((item) => item.isException === false)).toBe(true);
  });

  it("menghormati tanggal akhir pengulangan", () => {
    const result = generateKajianOccurrences(
      schedule({ recurrenceUntil: new Date("2026-01-21T00:00:00.000Z") }),
      [],
      new Date("2026-01-01T00:00:00.000Z"),
      { maxOccurrences: 10 }
    );

    expect(result.map((item) => item.occurrenceDate)).toEqual([
      "2026-01-07",
      "2026-01-14",
      "2026-01-21",
    ]);
  });

  it("melewati pertemuan yang sudah lewat tanpa mengubah pekan lain", () => {
    const result = generateKajianOccurrences(
      schedule(),
      [],
      new Date("2026-01-15T00:00:00.000Z"),
      { maxOccurrences: 2 }
    );

    expect(result.map((item) => item.occurrenceDate)).toEqual([
      "2026-01-21",
      "2026-01-28",
    ]);
  });

  it("memindahkan satu pertemuan saja lewat pengecualian", () => {
    const result = generateKajianOccurrences(
      schedule(),
      [exception({ note: "Diundur karena acara takmir" })],
      new Date("2026-01-01T00:00:00.000Z"),
      { maxOccurrences: 3 }
    );

    expect(result).toHaveLength(3);
    const moved = result[1];
    expect(moved.occurrenceDate).toBe("2026-01-14");
    expect(moved.id).toBe("kajian-1@2026-01-14");
    expect(moved.startDateTime.toISOString()).toBe("2026-01-16T11:00:00.000Z");
    expect(moved.isException).toBe(true);
    expect(moved.originalStartDateTime?.toISOString()).toBe(
      "2026-01-14T11:00:00.000Z"
    );
    expect(moved.exceptionNote).toBe("Diundur karena acara takmir");

    // Pekan sebelum dan sesudahnya tetap pada jadwal semula.
    expect(result[0].startDateTime.toISOString()).toBe(
      "2026-01-07T11:00:00.000Z"
    );
    expect(result[2].startDateTime.toISOString()).toBe(
      "2026-01-21T11:00:00.000Z"
    );
  });

  it("mempertahankan durasi saat pertemuan dipindahkan", () => {
    const result = generateKajianOccurrences(
      schedule(),
      [
        exception({
          newStartDateTime: new Date("2026-01-16T09:00:00.000Z"),
          newEndDateTime: null,
        }),
      ],
      new Date("2026-01-01T00:00:00.000Z"),
      { maxOccurrences: 2 }
    );

    const moved = result.find((item) => item.isException);
    expect(moved?.startDateTime.toISOString()).toBe("2026-01-16T09:00:00.000Z");
    expect(moved?.endDateTime?.toISOString()).toBe("2026-01-16T11:00:00.000Z");
  });

  it("menyembunyikan kajian sekali-sekali yang sudah lewat", () => {
    const oneOff = schedule({
      isRecurring: false,
      recurrenceDay: null,
      startDateTime: new Date("2026-01-10T03:00:00.000Z"),
      endDateTime: null,
    });

    expect(
      generateKajianOccurrences(
        oneOff,
        [],
        new Date("2026-01-01T00:00:00.000Z")
      )
    ).toHaveLength(1);

    expect(
      generateKajianOccurrences(
        oneOff,
        [],
        new Date("2026-01-11T00:00:00.000Z")
      )
    ).toHaveLength(0);
  });

  it("menandai kajian sekali-sekali yang pernah dipindahkan", () => {
    const oneOff = schedule({
      isRecurring: false,
      recurrenceDay: null,
      startDateTime: new Date("2026-01-12T11:00:00.000Z"),
      endDateTime: null,
      rescheduledFrom: new Date("2026-01-10T11:00:00.000Z"),
    });

    const [result] = generateKajianOccurrences(
      oneOff,
      [],
      new Date("2026-01-01T00:00:00.000Z")
    );

    expect(result.isException).toBe(true);
    expect(result.id).toBe("kajian-1");
    expect(result.rescheduledFrom?.toISOString()).toBe(
      "2026-01-10T11:00:00.000Z"
    );
  });
});

describe("buildKajianOccurrences", () => {
  it("menggabungkan kajian tetap dan insidentil lalu mengurutkannya", () => {
    const oneOff = schedule({
      id: "kajian-2",
      title: "Kajian Akbar",
      isRecurring: false,
      recurrenceDay: null,
      startDateTime: new Date("2026-01-09T02:00:00.000Z"),
      endDateTime: null,
    });

    const result = buildKajianOccurrences({
      rows: [schedule(), oneOff],
      exceptions: [],
      from: new Date("2026-01-01T00:00:00.000Z"),
      take: 3,
    });

    expect(result.map((item) => item.id)).toEqual([
      "kajian-1@2026-01-07",
      "kajian-2",
      "kajian-1@2026-01-14",
    ]);
  });

  it("mengabaikan kajian yang tidak aktif", () => {
    const result = buildKajianOccurrences({
      rows: [schedule({ isActive: false })],
      exceptions: [],
      from: new Date("2026-01-01T00:00:00.000Z"),
      take: 5,
    });

    expect(result).toHaveLength(0);
  });

  it("meneruskan jenis libur dan kajian khusus ke pertemuan", () => {
    const result = buildKajianOccurrences({
      rows: [
        schedule({
          id: "kajian-libur",
          isRecurring: false,
          kajianType: "LIBUR",
        }),
        schedule({
          id: "kajian-khusus",
          isRecurring: false,
          kajianType: "KHUSUS",
          audience: "Asatidz",
        }),
      ],
      exceptions: [],
      from: new Date("2026-01-01T00:00:00.000Z"),
      take: 5,
    });

    expect(result[0]).toMatchObject({
      kajianType: "LIBUR",
      audience: null,
    });
    expect(result[1]).toMatchObject({
      kajianType: "KHUSUS",
      audience: "Asatidz",
    });
  });
});
