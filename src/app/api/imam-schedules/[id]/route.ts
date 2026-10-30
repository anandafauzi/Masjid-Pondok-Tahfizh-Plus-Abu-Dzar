import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  ok,
  parseDateOnly,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";

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

    let scheduleDate: Date | undefined;
    if (body.scheduleDate !== undefined) {
      const parsed = parseDateOnly(body.scheduleDate);
      if (!parsed) return badRequest("Tanggal tidak valid");
      scheduleDate = parsed;
    }

    const prayerName =
      body.prayerName !== undefined ? String(body.prayerName).trim() : undefined;
    const imamName =
      body.imamName !== undefined ? String(body.imamName).trim() : undefined;
    const muadzinName =
      body.muadzinName !== undefined ? String(body.muadzinName).trim() : undefined;
    if (prayerName !== undefined && !prayerName) {
      return badRequest("Nama shalat wajib diisi");
    }
    if (imamName !== undefined && !imamName) {
      return badRequest("Nama imam wajib diisi");
    }
    if (muadzinName !== undefined && !muadzinName) {
      return badRequest("Nama muadzin wajib diisi");
    }

    const item = await prisma.imamMuadzinSchedule.update({
      where: { id },
      data: {
        scheduleDate,
        prayerName,
        imamName,
        muadzinName,
        notes:
          body.notes === null
            ? null
            : body.notes !== undefined
              ? String(body.notes)
              : undefined,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_IMAM_SCHEDULE",
      entityType: "ImamMuadzinSchedule",
      entityId: item.id,
      changeSummary: "Memperbarui jadwal imam/muadzin",
    });

    revalidateAllAppPaths();

    return ok(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return badRequest(
        "Jadwal imam untuk tanggal dan shalat tersebut sudah ada"
      );
    }
    console.error(error);
    return serverError("Gagal memperbarui jadwal imam");
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
    await prisma.imamMuadzinSchedule.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_IMAM_SCHEDULE",
      entityType: "ImamMuadzinSchedule",
      entityId: id,
      changeSummary: "Menghapus jadwal imam/muadzin",
    });

    revalidateAllAppPaths();

    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Gagal menghapus jadwal imam");
  }
}
