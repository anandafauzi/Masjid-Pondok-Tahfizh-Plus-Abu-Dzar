import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  notFound,
  ok,
  parseDateOnly,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";
import { weekdayWib, ymdWib } from "@/lib/kajian";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = await request.json();

    const title =
      body.title !== undefined ? String(body.title).trim() : undefined;
    if (title !== undefined && !title) {
      return badRequest("Judul kajian wajib diisi");
    }
    const speakerName =
      body.speakerName !== undefined ? String(body.speakerName).trim() : undefined;
    if (speakerName !== undefined && !speakerName) {
      return badRequest("Nama pemateri wajib diisi");
    }

    if (body.startDateTime === null) {
      return badRequest("Waktu mulai tidak valid");
    }
    const startDateTime =
      body.startDateTime !== undefined
        ? new Date(body.startDateTime)
        : undefined;
    if (
      startDateTime !== undefined &&
      Number.isNaN(startDateTime.getTime())
    ) {
      return badRequest("Waktu mulai tidak valid");
    }
    const endDateTime =
      body.endDateTime !== undefined && body.endDateTime !== null
        ? new Date(body.endDateTime)
        : undefined;
    if (endDateTime !== undefined && Number.isNaN(endDateTime.getTime())) {
      return badRequest("Waktu selesai tidak valid");
    }

    const existing = await prisma.kajianSchedule.findUnique({ where: { id } });
    if (!existing) return notFound("Kajian tidak ditemukan");

    const nextStart = startDateTime ?? existing.startDateTime;
    const nextEnd =
      body.endDateTime === null
        ? null
        : (endDateTime ?? existing.endDateTime);
    if (nextEnd && nextEnd.getTime() < nextStart.getTime()) {
      return badRequest("Waktu selesai tidak boleh sebelum waktu mulai");
    }

    const isRecurring =
      body.isRecurring !== undefined
        ? Boolean(body.isRecurring)
        : existing.isRecurring;

    let recurrenceUntil: Date | null = existing.recurrenceUntil;
    if (body.recurrenceUntil !== undefined) {
      recurrenceUntil = parseDateOnly(body.recurrenceUntil);
      if (body.recurrenceUntil && !recurrenceUntil) {
        return badRequest("Tanggal akhir pengulangan tidak valid");
      }
    }
    if (!isRecurring) recurrenceUntil = null;
    if (
      isRecurring &&
      recurrenceUntil &&
      ymdWib(nextStart) > ymdWib(recurrenceUntil)
    ) {
      return badRequest(
        "Tanggal akhir pengulangan tidak boleh sebelum tanggal mulai"
      );
    }

    // Bila jadwal tetap dinonaktifkan, pengecualian lama tidak relevan lagi.
    // Bila hari pengulangan berubah, pengecualian juga tidak lagi cocok.
    const weekdayChanged =
      isRecurring &&
      (startDateTime !== undefined || !existing.isRecurring) &&
      weekdayWib(nextStart) !== existing.recurrenceDay;

    const item = await prisma.$transaction(async (tx) => {
      if (!isRecurring || weekdayChanged) {
        await tx.kajianException.deleteMany({ where: { kajianId: id } });
      }

      return tx.kajianSchedule.update({
        where: { id },
        data: {
          title,
          speakerName,
          bookOrTopic:
            body.bookOrTopic !== undefined ? body.bookOrTopic : undefined,
          startDateTime: startDateTime ?? undefined,
          endDateTime:
            body.endDateTime === null ? null : (endDateTime ?? undefined),
          location: body.location ?? undefined,
          description:
            body.description !== undefined ? body.description : undefined,
          isActive:
            body.isActive !== undefined ? Boolean(body.isActive) : undefined,
          isRecurring,
          recurrenceDay: isRecurring ? weekdayWib(nextStart) : null,
          recurrenceUntil,
        },
      });
    });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_KAJIAN",
      entityType: "KajianSchedule",
      entityId: item.id,
      changeSummary: `Memperbarui kajian: ${item.title}`,
    });

    revalidateAllAppPaths();

    return ok(item);
  } catch (error) {
    console.error(error);
    return serverError("Gagal memperbarui kajian");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    await prisma.kajianSchedule.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_KAJIAN",
      entityType: "KajianSchedule",
      entityId: id,
      changeSummary: "Menghapus kajian",
    });

    revalidateAllAppPaths();

    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Gagal menghapus kajian");
  }
}
