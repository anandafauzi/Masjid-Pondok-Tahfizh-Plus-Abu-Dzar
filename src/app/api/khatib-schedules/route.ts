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
import { todayDateOnly } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const from = parseDateOnly(searchParams.get("from")) ?? todayDateOnly();
    const items = await prisma.khatibSchedule.findMany({
      where: { fridayDate: { gte: from } },
      orderBy: { fridayDate: "asc" },
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
    const fridayDate = parseDateOnly(body.fridayDate);
    if (!fridayDate) return badRequest("Tanggal Jumat tidak valid");
    if (!body.khatibName || !String(body.khatibName).trim()) {
      return badRequest("Nama khatib wajib diisi");
    }

    const existing = await prisma.khatibSchedule.findFirst({
      where: { fridayDate },
    });
    if (existing) {
      return badRequest("Jadwal khatib untuk tanggal tersebut sudah ada");
    }

    const item = await prisma.khatibSchedule.create({
      data: {
        fridayDate,
        khatibName: String(body.khatibName).trim(),
        sermonTopic:
          body.sermonTopic != null ? String(body.sermonTopic) : null,
        backupKhatibName:
          body.backupKhatibName != null ? String(body.backupKhatibName) : null,
        notes: body.notes != null ? String(body.notes) : null,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "CREATE_KHATIB_SCHEDULE",
      entityType: "KhatibSchedule",
      entityId: item.id,
      changeSummary: `Menambah jadwal khatib ${item.khatibName}`,
    });

    return ok(item, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return badRequest("Jadwal khatib untuk tanggal tersebut sudah ada");
    }
    console.error(error);
    return serverError("Gagal menambah jadwal khatib");
  }
}
