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
  serverError,
  unauthorized,
} from "@/lib/api";
import { todayDateOnly } from "@/lib/datetime";
import { resolveRolling } from "@/lib/rolling";
import { writeAudit } from "@/lib/audit";

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
    const body = await request.json().catch(() => ({}));

    const parsedFriday = body.fridayDate
      ? parseDateOnly(String(body.fridayDate))
      : null;
    if (body.fridayDate && !parsedFriday) {
      return badRequest("Tanggal Jumat tidak valid");
    }
    const fridayDate = parsedFriday ?? todayDateOnly();

    const khatibName =
      (typeof body.khatibName === "string" && body.khatibName.trim()) ||
      (await resolveKhatibName(fridayDate));

    const durationMinutes =
      Number.isFinite(Number(body.durationMinutes)) && Number(body.durationMinutes) > 0
        ? Math.min(Math.max(Math.trunc(Number(body.durationMinutes)), 1), 180)
        : 40;

    const startMode = body.startMode === "AUTO" ? "AUTO" : "MANUAL";

    let scheduledStartAt: Date | null = null;
    if (startMode === "AUTO") {
      if (!body.scheduledStartAt) {
        return badRequest("Waktu mulai terjadwal wajib diisi");
      }
      const parsed = new Date(body.scheduledStartAt);
      if (Number.isNaN(parsed.getTime())) {
        return badRequest("Waktu mulai terjadwal tidak valid");
      }
      if (parsed.getTime() < Date.now() - 60_000) {
        return badRequest("Waktu mulai terjadwal harus di masa depan");
      }
      scheduledStartAt = parsed;
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

    return ok({ session }, 201);
  } catch (error) {
    if (error instanceof KhutbahConflictError) {
      return badRequest(error.message);
    }
    console.error(error);
    return serverError("Gagal memulai khutbah");
  }
}
