import { describe, expect, it } from "vitest";
import type { PetugasItem } from "@/types/petugas";
import {
  buildReminderMessage,
  buildReminderRecipients,
  findPetugasForName,
  isPlaceholderName,
  normalizePersonName,
  type DutyAssignment,
} from "@/lib/reminders";

const petugas: PetugasItem[] = [
  {
    id: "p1",
    name: "Ust. Ahmad Fauzi",
    roles: ["IMAM"],
    phone: "0812-3456-7890",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "p2",
    name: "Umar",
    roles: ["MUADZIN", "KHATIB"],
    phone: "+62 813 1111 2222",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "p3",
    name: "Utsman",
    roles: ["IMAM"],
    phone: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

function assignments(): DutyAssignment[] {
  return [
    { role: "IMAM", prayerName: "Subuh", personName: "Ahmad Fauzi" },
    { role: "MUADZIN", prayerName: "Subuh", personName: "Umar" },
    { role: "IMAM", prayerName: "Zuhur", personName: "Ust. Ahmad Fauzi" },
    { role: "KHATIB", prayerName: null, personName: "Umar" },
    { role: "IMAM", prayerName: "Asar", personName: "Utsman" },
  ];
}

describe("normalizePersonName", () => {
  it("mengabaikan gelar umum, tanda baca, dan kapitalisasi", () => {
    expect(normalizePersonName("Ust. Ahmad Fauzi, Lc.")).toBe("ahmad fauzi lc");
    expect(normalizePersonName("KH. Abdullah")).toBe("abdullah");
    expect(normalizePersonName("  ")).toBe("");
  });
});

describe("isPlaceholderName", () => {
  it("mengenali nama pengganti yang bukan petugas sungguhan", () => {
    expect(isPlaceholderName("Asatidzah Pondok")).toBe(true);
    expect(isPlaceholderName("Santri Bertugas")).toBe(true);
    expect(isPlaceholderName("-")).toBe(true);
    expect(isPlaceholderName("Ahmad Fauzi")).toBe(false);
  });
});

describe("findPetugasForName", () => {
  it("mencocokkan nama jadwal dengan Data Petugas", () => {
    expect(findPetugasForName("Ahmad Fauzi", "IMAM", petugas)?.id).toBe("p1");
    expect(findPetugasForName("Ust. Ahmad Fauzi", "IMAM", petugas)?.id).toBe("p1");
  });

  it("tetap menemukan orang yang merangkap peran lain", () => {
    expect(findPetugasForName("Umar", "KHATIB", petugas)?.id).toBe("p2");
  });
});

describe("buildReminderRecipients", () => {
  const recipients = buildReminderRecipients({
    dateYmd: "2026-11-20",
    dateLabel: "Jumat, 20 November 2026",
    mosqueName: "Masjid Abu Dzar",
    assignments: assignments(),
    petugas,
  });

  it("menggabungkan seluruh tugas satu orang menjadi satu pesan", () => {
    const ahmad = recipients.find((item) => item.name === "Ust. Ahmad Fauzi");
    expect(ahmad).toBeDefined();
    expect(ahmad?.duties.map((duty) => duty.label)).toEqual(["Imam Subuh", "Imam Zuhur"]);
    expect(ahmad?.phone).toBe("6281234567890");
    expect(ahmad?.dedupeKey).toBe("2026-11-20:wa:6281234567890");
  });

  it("menggabungkan tugas imam, muadzin, dan khatib pada orang yang sama", () => {
    const umar = recipients.find((item) => item.name === "Umar");
    expect(umar?.duties.map((duty) => duty.label)).toEqual([
      "Muadzin Subuh",
      "Khatib Jumat",
    ]);
  });

  it("menyertakan penerima tanpa nomor agar admin bisa melengkapinya", () => {
    const utsman = recipients.find((item) => item.name === "Utsman");
    expect(utsman?.phone).toBeNull();
    expect(utsman?.dedupeKey).toBe("2026-11-20:nophone:p3");
  });

  it("tidak mengirim pesan ke nama pengganti", () => {
    const extra = buildReminderRecipients({
      dateYmd: "2026-11-20",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      assignments: [
        { role: "IMAM", prayerName: "Subuh", personName: "Asatidzah Pondok" },
        { role: "MUADZIN", prayerName: "Subuh", personName: "Santri Bertugas" },
      ],
      petugas,
    });
    expect(extra).toHaveLength(0);
  });

  it("menggabungkan orang berbeda yang memakai nomor yang sama", () => {
    const shared = buildReminderRecipients({
      dateYmd: "2026-11-20",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      assignments: [
        { role: "IMAM", prayerName: "Subuh", personName: "Ahmad Fauzi" },
        { role: "MUADZIN", prayerName: "Subuh", personName: "Umar" },
      ],
      petugas: petugas.map((item) =>
        item.id === "p2" ? { ...item, phone: "0812 3456 7890" } : item
      ),
    });
    expect(shared).toHaveLength(1);
    expect(shared[0].duties).toHaveLength(2);
    expect(shared[0].name).toContain("&");
  });
});

describe("buildReminderMessage", () => {
  it("memuat sapaan, tanggal, dan seluruh tugas", () => {
    const message = buildReminderMessage({
      name: "Ust. Ahmad Fauzi",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      duties: [
        { role: "IMAM", prayerName: "Subuh", label: "Imam Subuh", personName: "Ahmad", matched: true },
        { role: "KHATIB", prayerName: null, label: "Khatib Jumat", personName: "Ahmad", matched: true },
      ],
    });

    expect(message).toContain("PENGINGAT TUGAS BESOK");
    expect(message).toContain("Masjid Abu Dzar");
    expect(message).toContain("*Ust. Ahmad Fauzi*");
    expect(message).toContain("Jumat, 20 November 2026");
    expect(message).toContain("• *Imam Subuh*");
    expect(message).toContain("• *Khatib Jumat*");
    expect(message).toContain("جزاكم الله خيرا");
  });
});
