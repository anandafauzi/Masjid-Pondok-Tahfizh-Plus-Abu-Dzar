import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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
import { tarawihImamLabel } from "@/lib/tarawih";
import {
  assignIsyaImamFromTarawih,
  clearAutoIsyaImam,
} from "@/lib/tarawih-sync";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    if (!body) return badRequest("Format data tidak valid");

    const existing = await prisma.tarawihSchedule.findUnique({ where: { id } });
    if (!existing) return notFound("Jadwal Tarawih tidak ditemukan");

    let scheduleDate = existing.scheduleDate;
    if (body.scheduleDate !== undefined) {
      const parsed = parseDateOnly(body.scheduleDate);
      if (!parsed) return badRequest("Tanggal tidak valid");
      scheduleDate = parsed;
    }

    let imamName = existing.imamName;
    if (body.imamName !== undefined) {
      imamName = String(body.imamName).trim();
      if (!imamName) return badRequest("Nama imam wajib diisi");
    }

    let imamName2 = existing.imamName2;
    if (body.imamName2 !== undefined) {
      const parsedImam2 =
        body.imamName2 === null ? "" : String(body.imamName2).trim();
      imamName2 = parsedImam2 || null;
    }
    if (imamName2 && imamName2 === imamName) {
      return badRequest("Imam kedua harus berbeda dari imam pertama");
    }

    let notes = existing.notes;
    if (body.notes !== undefined) {
      notes =
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null;
    }

    const item = await prisma.$transaction(async (tx) => {
      const dateChanged = existing.scheduleDate.getTime() !== scheduleDate.getTime();
      if (dateChanged) {
        await clearAutoIsyaImam(tx, existing.scheduleDate, existing.imamName);
      }

      const updated = await tx.tarawihSchedule.update({
        where: { id },
        data: { scheduleDate, imamName, imamName2, notes },
      });
      await assignIsyaImamFromTarawih(tx, scheduleDate, imamName, user.id);
      return updated;
    });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_TARAWIH_SCHEDULE",
      entityType: "TarawihSchedule",
      entityId: item.id,
      changeSummary: `Mengubah jadwal imam Tarawih ${tarawihImamLabel(item.imamName, item.imamName2)}`,
    });
    revalidateAllAppPaths();
    return ok(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return badRequest("Jadwal Tarawih untuk tanggal tersebut sudah ada");
    }
    if (isPrismaNotFound(error)) return notFound("Jadwal Tarawih tidak ditemukan");
    console.error(error);
    return serverError("Gagal mengubah jadwal Tarawih");
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
    const existing = await prisma.tarawihSchedule.findUnique({ where: { id } });
    if (!existing) return notFound("Jadwal Tarawih tidak ditemukan");

    await prisma.$transaction(async (tx) => {
      await clearAutoIsyaImam(tx, existing.scheduleDate, existing.imamName);
      await tx.tarawihSchedule.delete({ where: { id } });
    });

    await writeAudit({
      adminId: user.id,
      action: "DELETE_TARAWIH_SCHEDULE",
      entityType: "TarawihSchedule",
      entityId: existing.id,
      changeSummary: `Menghapus jadwal imam Tarawih ${tarawihImamLabel(existing.imamName, existing.imamName2)}`,
    });
    revalidateAllAppPaths();
    return ok({ success: true });
  } catch (error) {
    if (isPrismaNotFound(error)) return notFound("Jadwal Tarawih tidak ditemukan");
    console.error(error);
    return serverError("Gagal menghapus jadwal Tarawih");
  }
}
