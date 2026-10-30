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
import { addDaysUTC, todayDateOnly } from "@/lib/datetime";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const from =
      parseDateOnly(searchParams.get("from")) ?? addDaysUTC(todayDateOnly(), -7);
    const to =
      parseDateOnly(searchParams.get("to")) ?? addDaysUTC(todayDateOnly(), 30);

    const items = await prisma.imamMuadzinSchedule.findMany({
      where: { scheduleDate: { gte: from, lte: to } },
      orderBy: [{ scheduleDate: "asc" }, { prayerName: "asc" }],
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
    const scheduleDate = parseDateOnly(body.scheduleDate);
    if (!scheduleDate) return badRequest("Tanggal tidak valid");
    const prayerName = String(body.prayerName ?? "").trim();
    const imamName = String(body.imamName ?? "").trim();
    const muadzinName = String(body.muadzinName ?? "").trim();
    if (!prayerName) return badRequest("Nama shalat wajib diisi");
    if (!imamName) return badRequest("Nama imam wajib diisi");
    if (!muadzinName) return badRequest("Nama muadzin wajib diisi");

    const item = await prisma.imamMuadzinSchedule.create({
      data: {
        scheduleDate,
        prayerName,
        imamName,
        muadzinName,
        notes:
          typeof body.notes === "string" && body.notes.trim()
            ? body.notes.trim()
            : null,
        createdBy: user.id,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "CREATE_IMAM_SCHEDULE",
      entityType: "ImamMuadzinSchedule",
      entityId: item.id,
      changeSummary: `Menambah jadwal imam ${item.imamName} untuk ${item.prayerName}`,
    });

    revalidateAllAppPaths();

    return ok(item, 201);
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
    return serverError("Gagal menambah jadwal imam");
  }
}
