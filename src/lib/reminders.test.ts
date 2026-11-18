import { describe, expect, it } from "vitest";
import type { PetugasItem } from "@/types/petugas";
import {
  buildReminderRecipients,
  findPetugasForName,
  isPlaceholderName,
  normalizePersonName,
  renderReminderMessage,
  type DutyAssignment,
} from "@/lib/reminders";
import { DEFAULT_REMINDER_SETTINGS } from "@/lib/reminder-settings";

const petugas: PetugasItem[] = [
  {
    id: "p1",
    name: "Ust. Ahmad Fauzi",
    roles: ["IMAM"],
    email: "Ahmad@AbuDzar.sch.id",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "p2",
    name: "Umar",
    roles: ["MUADZIN", "KHATIB"],
    email: "umar@gmail.com",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "p3",
    name: "Utsman",
    roles: ["IMAM"],
    email: null,
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
  const settings = DEFAULT_REMINDER_SETTINGS;
  const recipients = buildReminderRecipients({
    dateYmd: "2026-11-20",
    dateLabel: "Jumat, 20 November 2026",
    mosqueName: "Masjid Abu Dzar",
    assignments: assignments(),
    petugas,
    settings,
  });

  it("menggabungkan seluruh tugas satu orang menjadi satu email", () => {
    const ahmad = recipients.find((item) => item.name === "Ust. Ahmad Fauzi");
    expect(ahmad).toBeDefined();
    expect(ahmad?.duties.map((duty) => duty.label)).toEqual(["Imam Subuh", "Imam Zuhur"]);
    expect(ahmad?.email).toBe("ahmad@abudzar.sch.id");
    expect(ahmad?.dedupeKey).toBe("2026-11-20:email:ahmad@abudzar.sch.id");
  });

  it("tidak memasukkan muadzin ke daftar penerima email", () => {
    const umar = recipients.find((item) => item.name === "Umar");
    expect(umar?.duties.map((duty) => duty.label)).toEqual(["Khatib Jumat"]);
    expect(umar?.roles).toEqual(["KHATIB"]);
    expect(umar?.message).not.toContain("Muadzin");
  });

  it("melewati tugas muadzin meski tidak ada tugas lain", () => {
    const onlyMuadzin = buildReminderRecipients({
      dateYmd: "2026-11-20",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      assignments: [{ role: "MUADZIN", prayerName: "Subuh", personName: "Umar" }],
      petugas,
      settings,
    });
    expect(onlyMuadzin).toHaveLength(0);
  });

  it("memakai template khatib bila ada tugas khatib, template imam jika tidak", () => {
    const custom = {
      ...settings,
      imamTemplate: "IMAM {nama} {daftar_tugas}",
      khatibTemplate: "KHATIB {nama} {daftar_tugas}",
    };
    const result = buildReminderRecipients({
      dateYmd: "2026-11-20",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      assignments: [
        { role: "IMAM", prayerName: "Subuh", personName: "Ahmad Fauzi" },
        { role: "IMAM", prayerName: "Zuhur", personName: "Umar" },
        { role: "KHATIB", prayerName: null, personName: "Umar" },
      ],
      petugas,
      settings: custom,
    });
    expect(result.find((item) => item.name.includes("Ahmad"))?.message).toBe(
      "IMAM Ust. Ahmad Fauzi - Imam Subuh"
    );
    // Umar merangkap imam + khatib: template khatib yang menang.
    expect(result.find((item) => item.name === "Umar")?.message).toBe(
      "KHATIB Umar - Imam Zuhur\n- Khatib Jumat"
    );
  });

  it("menyertakan penerima tanpa email agar admin bisa melengkapinya", () => {
    const utsman = recipients.find((item) => item.name === "Utsman");
    expect(utsman?.email).toBeNull();
    expect(utsman?.dedupeKey).toBe("2026-11-20:noemail:p3");
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
      settings,
    });
    expect(extra).toHaveLength(0);
  });

  it("menggabungkan orang berbeda yang memakai email yang sama", () => {
    const shared = buildReminderRecipients({
      dateYmd: "2026-11-20",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      assignments: [
        { role: "IMAM", prayerName: "Subuh", personName: "Ahmad Fauzi" },
        { role: "IMAM", prayerName: "Zuhur", personName: "Umar" },
      ],
      petugas: petugas.map((item) =>
        item.id === "p2" ? { ...item, email: "AHMAD@abudzar.sch.id" } : item
      ),
      settings,
    });
    expect(shared).toHaveLength(1);
    expect(shared[0].duties).toHaveLength(2);
    expect(shared[0].name).toContain("&");
  });

  it("menganggap email tidak valid sebagai belum diisi", () => {
    const invalid = buildReminderRecipients({
      dateYmd: "2026-11-20",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      assignments: [{ role: "IMAM", prayerName: "Subuh", personName: "Umar" }],
      petugas: petugas.map((item) =>
        item.id === "p2" ? { ...item, email: "bukan-email" } : item
      ),
      settings,
    });
    expect(invalid[0].email).toBeNull();
    expect(invalid[0].rawEmail).toBe("bukan-email");
    expect(invalid[0].dedupeKey).toBe("2026-11-20:noemail:p2");
  });
});

describe("renderReminderMessage", () => {
  it("mengganti semua variabel template tanpa menyisakan placeholder", () => {
    const message = renderReminderMessage({
      template:
        "Halo {nama} dari {masjid}, {tanggal}. Tugas: {tugas}\n{daftar_tugas}",
      name: "Ust. Ahmad Fauzi",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      duties: [
        { role: "IMAM", prayerName: "Subuh", label: "Imam Subuh", personName: "Ahmad", matched: true },
        { role: "KHATIB", prayerName: null, label: "Khatib Jumat", personName: "Ahmad", matched: true },
      ],
    });

    expect(message).toBe(
      "Halo Ust. Ahmad Fauzi dari Masjid Abu Dzar, Jumat, 20 November 2026. Tugas: Imam Subuh, Khatib Jumat\n- Imam Subuh\n- Khatib Jumat"
    );
    expect(message).not.toContain("{");
  });

  it("membiarkan teks bebas apa adanya", () => {
    const message = renderReminderMessage({
      template: "Pengingat `{nama}` — jangan lupa!",
      name: "Umar",
      dateLabel: "Jumat, 20 November 2026",
      mosqueName: "Masjid Abu Dzar",
      duties: [],
    });
    expect(message).toBe("Pengingat `Umar` — jangan lupa!");
  });
});
