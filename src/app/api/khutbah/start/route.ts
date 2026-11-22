import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  KhutbahConflictError,
  startKhutbah,
} from "@/lib/khutbah";
import {
  badRequest,
  getSessionUser,
  ok,
  parseDateOnly,
  readJsonBody,
  serverError,
  unauthorized,
} from "@/lib/api";
import {
  dateOnlyToString,
  nextFriday,
  toDateOnlyString,
  todayDateOnly,
} from "@/lib/datetime";
import { resolveRolling } from "@/lib/rolling";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

async function resolveKhatibName(fridayDate: Date): Promise<string> {
  const schedule = await prisma.khatibSchedule.findFirst({
    where: { fridayDate },
  });
  if (schedule?.khatibName) return schedule.khatibName;

  const rolling = await prisma.khatibRollingSetting.findMany({
    where: { isActive: true },
  });
  const resolved = resolveRolling(
    rolling.map((r) => ({
      id: r.id,
      khatibName: r.khatibName,
      sequenceNumber: r.sequenceNumber,
      effectiveFrom: r.effectiveFrom,
      effectiveUntil: r.effectiveUntil,
      isActive: r.isActive,
      createdAt: r.createdAt,
    })),
    fridayDate
  );

  return resolved?.name ?? "Khatib";
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await readJsonBody(request);
    if (!body) return badRequest("Format data tidak valid");

    const startMode = body.startMode === "AUTO" ? "AUTO" : "MANUAL";

    const parsedFriday = body.fridayDate
      ? parseDateOnly(String(body.fridayDate))
      : null;
    if (body.fridayDate && !parsedFriday) {
      return badRequest("Tanggal Jumat tidak valid");
    }
    if (parsedFriday && parsedFriday.getUTCDay() !== 5) {
      return badRequest("Tanggal khutbah harus hari Jumat");
    }

    const parsedScheduled =
      startMode === "AUTO" && body.scheduledStartAt
        ? new Date(String(body.scheduledStartAt))
        : null;
    if (
      startMode === "AUTO" &&
      body.scheduledStartAt &&
      (!parsedScheduled || Number.isNaN(parsedScheduled.getTime()))
    ) {
      return badRequest("Waktu mulai terjadwal tidak valid");
    }

    const today = todayDateOnly();
    // Untuk mode AUTO, tanggal Jumat diambil dari waktu mulai yang dipilih.
    // Memakai nextFriday(today) membuat penjadwalan Jumat minggu depan dari
    // hari biasa selalu gagal pada validasi tanggal di bawah.
    const scheduledFriday = parsedScheduled
      ? parseDateOnly(toDateOnlyString(parsedScheduled))
      : null;
    if (parsedScheduled && !scheduledFriday) {
      return badRequest("Tanggal mulai terjadwal tidak valid");
    }
    const fridayDate = parsedFriday ?? scheduledFriday ?? nextFriday(today);

    if (startMode === "AUTO" && fridayDate.getUTCDay() !== 5) {
      return badRequest("Waktu mulai terjadwal harus pada hari Jumat");
    }
    if (!parsedFriday && startMode === "MANUAL" && today.getUTCDay() !== 5) {
      return badRequest(
        "Khutbah Jumat hanya dapat dimulai pada hari Jumat"
      );
    }

    if (startMode === "MANUAL" && fridayDate.getTime() !== today.getTime()) {
      return badRequest("Khutbah manual hanya dapat dimulai untuk hari ini");
    }

    const khatibName =
      (typeof body.khatibName === "string" && body.khatibName.trim()) ||
      (await resolveKhatibName(fridayDate));

    const durationMinutes =
      Number.isFinite(Number(body.durationMinutes)) && Number(body.durationMinutes) > 0
        ? Math.min(Math.max(Math.trunc(Number(body.durationMinutes)), 1), 180)
        : 40;

    let scheduledStartAt: Date | null = null;
    if (startMode === "AUTO") {
      if (!parsedScheduled) {
        return badRequest("Waktu mulai terjadwal wajib diisi");
      }
      if (parsedScheduled.getTime() < Date.now() - 60_000) {
        return badRequest("Waktu mulai terjadwal harus di masa depan");
      }
      if (toDateOnlyString(parsedScheduled) !== dateOnlyToString(fridayDate)) {
        return badRequest(
          "Waktu mulai terjadwal harus pada tanggal Jumat yang dipilih"
        );
      }
      scheduledStartAt = parsedScheduled;
    }

    const sermonTopic =
      typeof body.sermonTopic === "string" && body.sermonTopic.trim()
        ? body.sermonTopic.trim()
        : null;

    const session = await startKhutbah({
      fridayDate,
      khatibName,
      sermonTopic,
      durationMinutes,
      startMode,
      scheduledStartAt,
      startedById: user.id,
    });

    await writeAudit({
      adminId: user.id,
      action: "START_KHUTBAH",
      entityType: "KhutbahSession",
      entityId: session.id,
      changeSummary: `Memulai khutbah Jumat oleh ${khatibName} selama ${durationMinutes} menit (${startMode})`,
    });

    revalidateAllAppPaths();
    return ok({ session }, 201);
  } catch (error) {
    if (error instanceof KhutbahConflictError) {
      return badRequest(error.message);
    }
    console.error(error);
    return serverError("Gagal memulai khutbah");
  }
}
