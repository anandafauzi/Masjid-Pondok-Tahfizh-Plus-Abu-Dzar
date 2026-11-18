import type { Prisma } from "@prisma/client";
import {
  DEFAULT_AUTO_MUADZIN,
  TARAWIH_ISYA_NOTES,
} from "@/lib/tarawih";

const ISYA = "Isya";

function whereIsya(scheduleDate: Date) {
  return {
    scheduleDate_prayerName: { scheduleDate, prayerName: ISYA },
  };
}

/**
 * Imam pertama Tarawih otomatis menjadi Imam Isya pada tanggal yang sama.
 * Baris Isya yang sudah ada (manual/pekanan) hanya diperbarui nama imamnya,
 * muadzin dan catatannya tidak diubah.
 */
export async function assignIsyaImamFromTarawih(
  tx: Prisma.TransactionClient,
  scheduleDate: Date,
  imamName: string,
  adminId?: string
) {
  const existing = await tx.imamMuadzinSchedule.findUnique({
    where: whereIsya(scheduleDate),
  });

  if (existing) {
    return tx.imamMuadzinSchedule.update({
      where: { id: existing.id },
      data: { imamName },
    });
  }

  return tx.imamMuadzinSchedule.create({
    data: {
      scheduleDate,
      prayerName: ISYA,
      imamName,
      muadzinName: DEFAULT_AUTO_MUADZIN,
      notes: TARAWIH_ISYA_NOTES,
      createdBy: adminId ?? null,
    },
  });
}

/**
 * Hapus baris Isya otomatis hanya jika masih berisi imam Tarawih yang lama.
 * Baru Isya buatan admin/manual tidak pernah dihapus.
 */
export async function clearAutoIsyaImam(
  tx: Prisma.TransactionClient,
  scheduleDate: Date,
  expectedImam: string
) {
  const row = await tx.imamMuadzinSchedule.findUnique({
    where: whereIsya(scheduleDate),
  });
  if (!row) return;
  if (row.notes !== TARAWIH_ISYA_NOTES) return;
  if (row.imamName.trim() !== expectedImam.trim()) return;
  await tx.imamMuadzinSchedule.delete({ where: { id: row.id } });
}
