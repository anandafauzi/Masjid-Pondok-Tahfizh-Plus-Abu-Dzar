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
      return badRequest("Isi running text wajib diisi");
    }

    const item = await prisma.runningText.update({
      where: { id },
      data: {
        content,
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
      action: "UPDATE_RUNNING_TEXT",
      entityType: "RunningText",
      entityId: item.id,
      changeSummary: "Memperbarui running text",
    });

    revalidateAllAppPaths();

    return ok(item);
  } catch (error) {
    console.error(error);
    return serverError("Gagal memperbarui running text");
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
    await prisma.runningText.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_RUNNING_TEXT",
      entityType: "RunningText",
      entityId: id,
      changeSummary: "Menghapus running text",
    });

    revalidateAllAppPaths();

    return ok({ success: true });
  } catch (error) {
    console.error(error);
    return serverError("Gagal menghapus running text");
  }
}
