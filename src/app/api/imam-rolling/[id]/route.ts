import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  notFound,
  ok,
  parseDateOnly,
  parseIntOr,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { isValidEffectiveRange } from "@/lib/rolling";
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

    const imamName =
      body.imamName !== undefined ? String(body.imamName).trim() : undefined;
    if (imamName !== undefined && !imamName) {
      return badRequest("Nama imam wajib diisi");
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

    const existing = await prisma.imamRollingSetting.findUnique({
      where: { id },
    });
    if (!existing) return notFound("Imam rolling tidak ditemukan");

    const nextFrom = effectiveFrom ?? existing.effectiveFrom;
    const nextUntil =
      effectiveUntil !== undefined ? effectiveUntil : existing.effectiveUntil;
    if (!isValidEffectiveRange(nextFrom, nextUntil)) {
      return badRequest(
        "Tanggal berlaku sampai tidak boleh sebelum tanggal mulai"
      );
    }

    const item = await prisma.imamRollingSetting.update({
      where: { id },
      data: {
        imamName,
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
      action: "UPDATE_IMAM_ROLLING",
      entityType: "ImamRollingSetting",
      entityId: item.id,
      changeSummary: "Memperbarui imam rolling",
    });
    revalidateAllAppPaths();
    return ok(item);
  } catch (error) {
    console.error(error);
    return serverError("Gagal memperbarui imam rolling");
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
    await prisma.imamRollingSetting.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_IMAM_ROLLING",
      entityType: "ImamRollingSetting",
      entityId: id,
      changeSummary: "Menghapus imam rolling",
    });
    revalidateAllAppPaths();
    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Gagal menghapus imam rolling");
  }
}
