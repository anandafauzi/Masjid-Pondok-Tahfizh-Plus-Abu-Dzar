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

    let fridayDate: Date | undefined;
    if (body.fridayDate !== undefined) {
      const parsed = parseDateOnly(body.fridayDate);
      if (!parsed) return badRequest("Tanggal Jumat tidak valid");
      if (parsed.getUTCDay() !== 5) {
        return badRequest("Jadwal khatib hanya untuk hari Jumat");
      }
      fridayDate = parsed;
    }

    const khatibName =
      body.khatibName !== undefined ? String(body.khatibName).trim() : undefined;
    if (khatibName !== undefined && !khatibName) {
      return badRequest("Nama khatib wajib diisi");
    }

    const item = await prisma.khatibSchedule.update({
      where: { id },
      data: {
        fridayDate,
        khatibName,
        sermonTopic:
          body.sermonTopic === null
            ? null
            : body.sermonTopic !== undefined
              ? String(body.sermonTopic)
              : undefined,
        backupKhatibName:
          body.backupKhatibName === null
            ? null
            : body.backupKhatibName !== undefined
              ? String(body.backupKhatibName)
              : undefined,
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
      action: "UPDATE_KHATIB_SCHEDULE",
      entityType: "KhatibSchedule",
      entityId: item.id,
      changeSummary: "Memperbarui jadwal khatib",
    });
    revalidateAllAppPaths();
    return ok(item);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return badRequest("Jadwal khatib untuk tanggal tersebut sudah ada");
    }
    console.error(error);
    return serverError("Gagal memperbarui jadwal khatib");
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
    await prisma.khatibSchedule.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_KHATIB_SCHEDULE",
      entityType: "KhatibSchedule",
      entityId: id,
      changeSummary: "Menghapus jadwal khatib",
    });
    revalidateAllAppPaths();
    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Gagal menghapus jadwal khatib");
  }
}
