import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, getSessionUser, ok, serverError, unauthorized } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const items = await prisma.kajianSchedule.findMany({
      orderBy: { startDateTime: "asc" },
    });
    return ok(items);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    if (!body.title || !String(body.title).trim()) {
      return badRequest("Judul kajian wajib diisi");
    }
    if (!body.speakerName || !String(body.speakerName).trim()) {
      return badRequest("Nama pemateri wajib diisi");
    }
    const startDateTime = body.startDateTime ? new Date(body.startDateTime) : null;
    if (!startDateTime || Number.isNaN(startDateTime.getTime())) {
      return badRequest("Waktu mulai tidak valid");
    }
    const endDateTime = body.endDateTime ? new Date(body.endDateTime) : null;
    if (endDateTime && Number.isNaN(endDateTime.getTime())) {
      return badRequest("Waktu selesai tidak valid");
    }
    if (endDateTime && endDateTime.getTime() < startDateTime.getTime()) {
      return badRequest("Waktu selesai tidak boleh sebelum waktu mulai");
    }

    const item = await prisma.kajianSchedule.create({
      data: {
        title: String(body.title).trim(),
        speakerName: String(body.speakerName).trim(),
        bookOrTopic: body.bookOrTopic ?? null,
        startDateTime,
        endDateTime,
        location: body.location ?? "Masjid",
        description: body.description ?? null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "CREATE_KAJIAN",
      entityType: "KajianSchedule",
      entityId: item.id,
      changeSummary: `Menambah kajian: ${item.title}`,
    });

    revalidateAllAppPaths();

    return ok(item, 201);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menambah kajian");
  }
}
