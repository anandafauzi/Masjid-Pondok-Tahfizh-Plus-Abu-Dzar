import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  notFound,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : "";
    const direction = body.direction;

    if (!id) return badRequest("ID khatib rolling wajib diisi");
    if (direction !== "up" && direction !== "down") {
      return badRequest("Arah perpindahan tidak valid");
    }

    const items = await prisma.khatibRollingSetting.findMany({
      orderBy: [
        { sequenceNumber: "asc" },
        { createdAt: "asc" },
        { id: "asc" },
      ],
    });
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return notFound("Data khatib rolling tidak ditemukan");

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return ok(items);
    }

    const reordered = [...items];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    const result = await prisma.$transaction(
      reordered.map((item, position) =>
        prisma.khatibRollingSetting.update({
          where: { id: item.id },
          data: { sequenceNumber: position + 1 },
        })
      )
    );

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_KHATIB_ROLLING_ORDER",
      entityType: "KhatibRollingSetting",
      entityId: id,
      changeSummary: `Mengubah urutan rotasi khatib ${items[index].khatibName}`,
    });

    return ok(result);
  } catch (error) {
    console.error(error);
    return serverError("Gagal mengubah urutan khatib rolling");
  }
}
