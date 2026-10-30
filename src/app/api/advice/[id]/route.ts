import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  ok,
  parseIntOr,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

const VERIFICATION_STATUSES = new Set([
  "VERIFIED",
  "UNVERIFIED",
  "NEEDS_REVIEW",
]);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { id } = await params;
    const body = await request.json();

    const content =
      body.content !== undefined ? String(body.content).trim() : undefined;
    if (content !== undefined && !content) {
      return badRequest("Isi nasihat wajib diisi");
    }

    const verificationStatus =
      body.verificationStatus === undefined
        ? undefined
        : String(body.verificationStatus);
    if (
      verificationStatus !== undefined &&
      !VERIFICATION_STATUSES.has(verificationStatus)
    ) {
      return badRequest("Status verifikasi tidak valid");
    }

    const item = await prisma.islamicAdvice.update({
      where: { id },
      data: {
        content,
        sourceReference:
          body.sourceReference === null
            ? null
            : body.sourceReference !== undefined
              ? String(body.sourceReference)
              : undefined,
        authorOrSource:
          body.authorOrSource === null
            ? null
            : body.authorOrSource !== undefined
              ? String(body.authorOrSource)
              : undefined,
        verificationStatus,
        displayOrder:
          body.displayOrder !== undefined
            ? parseIntOr(body.displayOrder, 0)
            : undefined,
        isActive:
          body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_ADVICE",
      entityType: "IslamicAdvice",
      entityId: item.id,
      changeSummary: "Memperbarui nasihat islami",
    });

    revalidateAllAppPaths();

    return ok(item);
  } catch (error) {
    console.error(error);
    return serverError("Gagal memperbarui nasihat");
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
    await prisma.islamicAdvice.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_ADVICE",
      entityType: "IslamicAdvice",
      entityId: id,
      changeSummary: "Menghapus nasihat islami",
    });

    revalidateAllAppPaths();

    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Gagal menghapus nasihat");
  }
}
