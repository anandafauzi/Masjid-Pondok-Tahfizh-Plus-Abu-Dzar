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

    const khatibName =
      body.khatibName !== undefined ? String(body.khatibName).trim() : undefined;
    if (khatibName !== undefined && !khatibName) {
      return badRequest("Nama khatib wajib diisi");
    }

    let effectiveFrom: Date | undefined;
    if (body.effectiveFrom !== undefined) {
      const parsed = parseDateOnly(body.effectiveFrom);
      if (!parsed) return badRequest("Tanggal berlaku tidak valid");
      effectiveFrom = parsed;
    }

    let effectiveUntil: Date | null | undefined;
    if (body.effectiveUntil !== undefined) {
      if (body.effectiveUntil === null) {
        effectiveUntil = null;
      } else {
        const parsed = parseDateOnly(body.effectiveUntil);
        if (!parsed) return badRequest("Tanggal berlaku sampai tidak valid");
        effectiveUntil = parsed;
      }
    }

    const item = await prisma.khatibRollingSetting.update({
      where: { id },
      data: {
        khatibName,
        sequenceNumber:
          body.sequenceNumber !== undefined
            ? parseIntOr(body.sequenceNumber, 1)
            : undefined,
        effectiveFrom,
        effectiveUntil,
        isActive:
          body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });
    await writeAudit({
      adminId: user.id,
      action: "UPDATE_KHATIB_ROLLING",
      entityType: "KhatibRollingSetting",
      entityId: item.id,
      changeSummary: "Memperbarui khatib rolling",
    });
    return ok(item);
  } catch (error) {
    console.error(error);
    return serverError("Gagal memperbarui khatib rolling");
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
    await prisma.khatibRollingSetting.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_KHATIB_ROLLING",
      entityType: "KhatibRollingSetting",
      entityId: id,
      changeSummary: "Menghapus khatib rolling",
    });
    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Gagal menghapus khatib rolling");
  }
}
