import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  readJsonBody,
  ok,
  parseDateOnly,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";
import { getAdminKajianData } from "@/lib/schedule-data";
import { weekdayWib, ymdWib } from "@/lib/kajian";
import { parseKajianType } from "@/lib/kajian-type";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const data = await getAdminKajianData();
    return ok(data);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJsonBody(request);
    if (!body) return badRequest("Format data tidak valid");
    if (!body.title || !String(body.title).trim()) {
      return badRequest("Judul kajian wajib diisi");
    }
    const kajianType = parseKajianType(body.kajianType);
    if (kajianType !== "LIBUR" && (!body.speakerName || !String(body.speakerName).trim())) {
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

    const isRecurring = body.isRecurring === true;
    const recurrenceUntil = isRecurring
      ? parseDateOnly(body.recurrenceUntil)
      : null;
    if (isRecurring && body.recurrenceUntil && !recurrenceUntil) {
      return badRequest("Tanggal akhir pengulangan tidak valid");
    }
    if (recurrenceUntil && ymdWib(startDateTime) > ymdWib(recurrenceUntil)) {
      return badRequest("Tanggal akhir pengulangan tidak boleh sebelum tanggal mulai");
    }

    const item = await prisma.kajianSchedule.create({
      data: {
        title: String(body.title).trim(),
        speakerName:
          kajianType === "LIBUR"
            ? String(body.speakerName ?? "").trim() || "Libur"
            : String(body.speakerName).trim(),
        kajianType,
        audience:
          typeof body.audience === "string" && body.audience.trim()
            ? body.audience.trim()
            : null,
        bookOrTopic: body.bookOrTopic ?? null,
        startDateTime,
        endDateTime,
        location: body.location ?? "Masjid",
        description: body.description ?? null,
        isRecurring,
        recurrenceDay: isRecurring ? weekdayWib(startDateTime) : null,
        recurrenceUntil,
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
