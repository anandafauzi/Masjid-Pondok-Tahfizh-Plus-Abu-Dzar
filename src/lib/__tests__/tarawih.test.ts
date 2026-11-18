import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_AUTO_MUADZIN,
  TARAWIH_ISYA_NOTES,
  tarawihImamLabel,
} from "@/lib/tarawih";
import {
  assignIsyaImamFromTarawih,
  clearAutoIsyaImam,
} from "@/lib/tarawih-sync";

type Transaction = Parameters<typeof assignIsyaImamFromTarawih>[0];

const TARAWIH_DATE = new Date("2027-02-18T00:00:00.000Z");

function makeTx(existing: Record<string, unknown> | null) {
  const findUnique = vi.fn().mockResolvedValue(existing);
  const update = vi.fn().mockResolvedValue({ id: "isya-1" });
  const create = vi.fn().mockResolvedValue({ id: "isya-new" });
  const remove = vi.fn().mockResolvedValue({ id: "isya-1" });
  const tx = {
    imamMuadzinSchedule: { findUnique, update, create, delete: remove },
  } as unknown as Transaction;
  return { tx, findUnique, update, create, remove };
}

describe("label imam Tarawih", () => {
  it("memakai satu nama bila imam kedua kosong", () => {
    expect(tarawihImamLabel("  Ust. Ahmad  ")).toBe("Ust. Ahmad");
    expect(tarawihImamLabel("Ust. Ahmad", null)).toBe("Ust. Ahmad");
    expect(tarawihImamLabel("Ust. Ahmad", "   ")).toBe("Ust. Ahmad");
  });

  it("menggabungkan dua imam dengan pemisah &", () => {
    expect(tarawihImamLabel("Ust. Ahmad", " Ust. Mahfud ")).toBe(
      "Ust. Ahmad & Ust. Mahfud"
    );
  });
});

describe("sinkronisasi imam Isya dari Tarawih", () => {
  it("memperbarui nama imam pada baris Isya yang sudah ada", async () => {
    const { tx, findUnique, update, create } = makeTx({
      id: "isya-1",
      imamName: "Ust. Lama",
      muadzinName: "Santri A",
      notes: "Jadwal manual",
    });

    await assignIsyaImamFromTarawih(tx, TARAWIH_DATE, "Ust. Ahmad", "admin-1");

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        scheduleDate_prayerName: {
          scheduleDate: TARAWIH_DATE,
          prayerName: "Isya",
        },
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "isya-1" },
      data: { imamName: "Ust. Ahmad" },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("membuat baris Isya otomatis bila belum ada", async () => {
    const { tx, update, create } = makeTx(null);

    await assignIsyaImamFromTarawih(tx, TARAWIH_DATE, "Ust. Ahmad", "admin-1");

    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({
      data: {
        scheduleDate: TARAWIH_DATE,
        prayerName: "Isya",
        imamName: "Ust. Ahmad",
        muadzinName: DEFAULT_AUTO_MUADZIN,
        notes: TARAWIH_ISYA_NOTES,
        createdBy: "admin-1",
      },
    });
  });

  it("menghapus hanya baris Isya otomatis yang cocok", async () => {
    const { tx, remove } = makeTx({
      id: "isya-1",
      imamName: "Ust. Ahmad",
      notes: TARAWIH_ISYA_NOTES,
    });

    await clearAutoIsyaImam(tx, TARAWIH_DATE, "Ust. Ahmad");

    expect(remove).toHaveBeenCalledWith({ where: { id: "isya-1" } });
  });

  it("tidak menghapus baris manual atau imam yang sudah berubah", async () => {
    const manual = makeTx({
      id: "isya-1",
      imamName: "Ust. Ahmad",
      notes: "Jadwal manual",
    });
    await clearAutoIsyaImam(manual.tx, TARAWIH_DATE, "Ust. Ahmad");
    expect(manual.remove).not.toHaveBeenCalled();

    const changed = makeTx({
      id: "isya-1",
      imamName: "Ust. Baru",
      notes: TARAWIH_ISYA_NOTES,
    });
    await clearAutoIsyaImam(changed.tx, TARAWIH_DATE, "Ust. Ahmad");
    expect(changed.remove).not.toHaveBeenCalled();
  });
});
