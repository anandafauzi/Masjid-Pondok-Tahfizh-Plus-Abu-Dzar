import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  readJsonBody,
  isPrismaNotFound,
  notFound,
  ok,
  parseDateOnly,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";
import { dateOnlyToString } from "@/lib/datetime";
import { weekdayWib, ymdWib } from "@/lib/kajian";

export const dynamic = "force-dynamic";

function durationMs(start: Date, end: Date | null): number | null {
  if (!end) return null;
  return Math.max(0, end.getTime() - start.getTime());
}

/**
 * Pindahkan satu pertemuan kajian ke hari/jam lain.
 *
 * - Jadwal tetap: menyimpan pengecualian untuk tanggal pertemuan tersebut,
 *   pekan lainnya tidak berubah.
 * - Kajian sekali-sekali: tanggal/jam baris kajian langsung diubah dan
 *   tanggal aslinya dicatat pada `rescheduledFrom`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    if (!body) return badRequest("Format data tidak valid");

    const existing = await prisma.kajianSchedule.findUnique({ where: { id } });
    if (!existing) return notFound("Kajian tidak ditemukan");

    const newStart = new Date(body.newStartDateTime);
    if (!body.newStartDateTime || Number.isNaN(newStart.getTime())) {
      return badRequest("Waktu baru tidak valid");
    }
    const explicitEnd =
      body.newEndDateTime !== undefined && body.newEndDateTime !== null
        ? new Date(body.newEndDateTime)
        : null;
    if (explicitEnd && Number.isNaN(explicitEnd.getTime())) {
      return badRequest("Waktu selesai baru tidak valid");
    }

    const note =
      body.note !== undefined && body.note !== null && String(body.note).trim()
        ? String(body.note).trim()
        : null;

    if (!existing.isRecurring) {
      const duration = durationMs(existing.startDateTime, existing.endDateTime);
      const newEnd =
        explicitEnd ?? (duration !== null ? new Date(newStart.getTime() + duration) : null);
      if (newEnd && newEnd.getTime() < newStart.getTime()) {
        return badRequest("Waktu selesai tidak boleh sebelum waktu mulai");
      }

      const item = await prisma.kajianSchedule.update({
        where: { id },
        data: {
          startDateTime: newStart,
          endDateTime: newEnd,
          rescheduledFrom: existing.rescheduledFrom ?? existing.startDateTime,
        },
      });

      await writeAudit({
        adminId: user.id,
        action: "RESCHEDULE_KAJIAN",
        entityType: "KajianSchedule",
        entityId: item.id,
        changeSummary: `Memindahkan kajian "${item.title}" ke ${dateOnlyToString(
          newStart
        )}`,
      });

      revalidateAllAppPaths();
      return ok(item);
    }

    const occurrenceDate = parseDateOnly(body.occurrenceDate);
    if (!occurrenceDate) {
      return badRequest("Tanggal pertemuan tidak valid");
    }

    const occurrenceYmd = dateOnlyToString(occurrenceDate);
    const startYmd = ymdWib(existing.startDateTime);
    if (occurrenceYmd < startYmd) {
      return badRequest("Pertemuan berada sebelum jadwal pertama");
    }
    if (
      existing.recurrenceDay !== null &&
      weekdayWib(occurrenceDate) !== existing.recurrenceDay
    ) {
      return badRequest("Tanggal tersebut bukan jadwal pertemuan kajian ini");
    }
    if (
      existing.recurrenceUntil &&
      occurrenceYmd > dateOnlyToString(existing.recurrenceUntil)
    ) {
      return badRequest("Pertemuan berada setelah tanggal akhir pengulangan");
    }

    const duration = durationMs(existing.startDateTime, existing.endDateTime);
    const newEnd =
      explicitEnd ?? (duration !== null ? new Date(newStart.getTime() + duration) : null);
    if (newEnd && newEnd.getTime() < newStart.getTime()) {
      return badRequest("Waktu selesai tidak boleh sebelum waktu mulai");
    }

    const item = await prisma.kajianException.upsert({
      where: {
        kajianId_occurrenceDate: { kajianId: id, occurrenceDate },
      },
      create: {
        kajianId: id,
        occurrenceDate,
        newStartDateTime: newStart,
        newEndDateTime: newEnd,
        note,
      },
      update: {
        newStartDateTime: newStart,
        newEndDateTime: newEnd,
        note,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "RESCHEDULE_KAJIAN",
      entityType: "KajianException",
      entityId: item.id,
      changeSummary: `Memindahkan kajian "${existing.title}" dari ${occurrenceYmd} ke ${dateOnlyToString(
        newStart
      )}`,
    });

    revalidateAllAppPaths();
    return ok(item, 201);
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return notFound("Kajian tidak ditemukan");
    }
    console.error(error);
    return serverError("Gagal memindahkan jadwal kajian");
  }
}

/** Batalkan perpindahan satu pertemuan dan kembalikan ke jadwal semula. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const occurrenceDate = parseDateOnly(
      new URL(request.url).searchParams.get("occurrenceDate")
    );

    const existing = await prisma.kajianSchedule.findUnique({ where: { id } });
    if (!existing) return notFound("Kajian tidak ditemukan");

    if (!existing.isRecurring) {
      if (!existing.rescheduledFrom) {
        return notFound("Kajian ini tidak sedang dipindahkan");
      }
      const duration = durationMs(existing.startDateTime, existing.endDateTime);
      const restoredStart = existing.rescheduledFrom;

      const item = await prisma.kajianSchedule.update({
        where: { id },
        data: {
          startDateTime: restoredStart,
          endDateTime:
            duration !== null
              ? new Date(restoredStart.getTime() + duration)
              : null,
          rescheduledFrom: null,
        },
      });

      await writeAudit({
        adminId: user.id,
        action: "RESTORE_KAJIAN",
        entityType: "KajianSchedule",
        entityId: item.id,
        changeSummary: `Mengembalikan jadwal kajian "${item.title}"`,
      });

      revalidateAllAppPaths();
      return ok(item);
    }

    if (!occurrenceDate) {
      return badRequest("Tanggal pertemuan tidak valid");
    }

    const deleted = await prisma.kajianException.deleteMany({
      where: { kajianId: id, occurrenceDate },
    });
    if (deleted.count === 0) {
      return notFound("Pertemuan ini tidak sedang dipindahkan");
    }

    await writeAudit({
      adminId: user.id,
      action: "RESTORE_KAJIAN",
      entityType: "KajianException",
      entityId: `${id}@${dateOnlyToString(occurrenceDate)}`,
      changeSummary: `Mengembalikan jadwal kajian "${existing.title}" pada ${dateOnlyToString(
        occurrenceDate
      )}`,
    });

    revalidateAllAppPaths();
    return ok({ success: true });
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return notFound("Kajian tidak ditemukan");
    }
    console.error(error);
    return serverError("Gagal mengembalikan jadwal kajian");
  }
}
