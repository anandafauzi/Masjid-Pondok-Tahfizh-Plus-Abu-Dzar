import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  isPrismaNotFound,
  notFound,
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
    const imamName =
      body.imamName !== undefined ? String(body.imamName).trim() : undefined;
    if (imamName !== undefined && !imamName) {
      return badRequest("Nama imam wajib diisi");
    }

    const item = await prisma.tarawihSchedule.update({
      where: { id },
      data: {
        ...(scheduleDate ? { scheduleDate } : {}),
        ...(imamName !== undefined ? { imamName } : {}),
        ...(body.notes !== undefined
          ? {
              notes:
                typeof body.notes === "string" && body.notes.trim()
                  ? body.notes.trim()
                  : null,
            }
          : {}),
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_TARAWIH_SCHEDULE",
      entityType: "TarawihSchedule",
      entityId: item.id,
      changeSummary: `Mengubah jadwal imam Tarawih ${item.imamName}`,
    });
    revalidateAllAppPaths();
    return ok(item);
  } catch (error) {
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
    const item = await prisma.tarawihSchedule.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_TARAWIH_SCHEDULE",
      entityType: "TarawihSchedule",
      entityId: item.id,
      changeSummary: `Menghapus jadwal imam Tarawih ${item.imamName}`,
    });
    revalidateAllAppPaths();
    return ok({ success: true });
  } catch (error) {
    if (isPrismaNotFound(error)) return notFound("Jadwal Tarawih tidak ditemukan");
    console.error(error);
    return serverError("Gagal menghapus jadwal Tarawih");
  }
}
