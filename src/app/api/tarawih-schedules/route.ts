import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  addDaysUTC,
  todayDateOnly,
} from "@/lib/datetime";
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

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const from =
      parseDateOnly(searchParams.get("from")) ?? addDaysUTC(todayDateOnly(), -30);
    const to =
      parseDateOnly(searchParams.get("to")) ?? addDaysUTC(todayDateOnly(), 365);

    const items = await prisma.tarawihSchedule.findMany({
      where: { scheduleDate: { gte: from, lte: to } },
      orderBy: { scheduleDate: "asc" },
    });
    return ok(items);
  } catch (error) {
    console.error(error);
    return serverError("Gagal membaca jadwal Tarawih");
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const scheduleDate = parseDateOnly(body.scheduleDate);
    if (!scheduleDate) return badRequest("Tanggal tidak valid");
    const imamName = String(body.imamName ?? "").trim();
    if (!imamName) return badRequest("Nama imam wajib diisi");

    const item = await prisma.tarawihSchedule.create({
      data: {
        scheduleDate,
        imamName,
        notes:
          typeof body.notes === "string" && body.notes.trim()
            ? body.notes.trim()
            : null,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "CREATE_TARAWIH_SCHEDULE",
      entityType: "TarawihSchedule",
      entityId: item.id,
      changeSummary: `Menambah imam Tarawih ${item.imamName}`,
    });
    revalidateAllAppPaths();
    return ok(item, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return badRequest("Jadwal Tarawih untuk tanggal tersebut sudah ada");
    }
    console.error(error);
    return serverError("Gagal menambah jadwal Tarawih");
  }
}
