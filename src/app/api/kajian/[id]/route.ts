import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";

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

    const item = await prisma.kajianSchedule.update({
      where: { id },
      data: {
        title,
        speakerName,
        bookOrTopic:
          body.bookOrTopic !== undefined ? body.bookOrTopic : undefined,
        startDateTime:
          startDateTime && !Number.isNaN(startDateTime.getTime())
            ? startDateTime
            : undefined,
        endDateTime:
          endDateTime && !Number.isNaN(endDateTime.getTime())
            ? endDateTime
            : body.endDateTime === null
              ? null
              : undefined,
        location: body.location ?? undefined,
        description:
          body.description !== undefined ? body.description : undefined,
        isActive:
          body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_KAJIAN",
      entityType: "KajianSchedule",
      entityId: item.id,
      changeSummary: `Memperbarui kajian: ${item.title}`,
    });

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
    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Gagal menghapus kajian");
  }
}
