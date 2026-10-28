import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  ok,
  parseDateOnly,
  parseIntOr,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { todayDateOnly } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const items = await prisma.khatibRollingSetting.findMany({
      orderBy: [
        { sequenceNumber: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
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
    if (!body.khatibName || !String(body.khatibName).trim()) {
      return badRequest("Nama khatib wajib diisi");
    }
    const parsedFrom = body.effectiveFrom
      ? parseDateOnly(body.effectiveFrom)
      : null;
    if (body.effectiveFrom && !parsedFrom) {
      return badRequest("Tanggal berlaku tidak valid");
    }
    const parsedUntil = body.effectiveUntil
      ? parseDateOnly(body.effectiveUntil)
      : null;
    if (body.effectiveUntil && !parsedUntil) {
      return badRequest("Tanggal berlaku sampai tidak valid");
    }

    const effectiveFrom = parsedFrom ?? todayDateOnly();
    const last = await prisma.khatibRollingSetting.findFirst({
      orderBy: { sequenceNumber: "desc" },
      select: { sequenceNumber: true },
    });
    const nextSequence = (last?.sequenceNumber ?? 0) + 1;

    const item = await prisma.khatibRollingSetting.create({
      data: {
        khatibName: String(body.khatibName).trim(),
        sequenceNumber:
          body.sequenceNumber !== undefined
            ? parseIntOr(body.sequenceNumber, nextSequence)
            : nextSequence,
        effectiveFrom,
        effectiveUntil: parsedUntil,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "CREATE_KHATIB_ROLLING",
      entityType: "KhatibRollingSetting",
      entityId: item.id,
      changeSummary: `Menambah khatib rolling ${item.khatibName}`,
    });

    return ok(item, 201);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menambah khatib rolling");
  }
}
