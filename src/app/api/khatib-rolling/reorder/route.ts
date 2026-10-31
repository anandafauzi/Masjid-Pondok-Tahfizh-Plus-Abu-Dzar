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

    const outcome = await prisma.$transaction(
      async (tx) => {
        const items = await tx.khatibRollingSetting.findMany({
          orderBy: [
            { sequenceNumber: "asc" },
            { createdAt: "asc" },
            { id: "asc" },
          ],
        });
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) {
          return { status: "not-found" as const };
        }

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= items.length) {
          return { status: "ok" as const, items };
        }

        const reordered = [...items];
        [reordered[index], reordered[targetIndex]] = [
          reordered[targetIndex],
          reordered[index],
        ];

        const result = [];
        for (let position = 0; position < reordered.length; position++) {
          result.push(
            await tx.khatibRollingSetting.update({
              where: { id: reordered[position].id },
              data: { sequenceNumber: position + 1 },
            })
          );
        }

        return {
          status: "ok" as const,
          items,
          result,
          name: items[index].khatibName,
        };
      },
      { isolationLevel: "Serializable" }
    );

    if (outcome.status === "not-found") {
      return notFound("Data khatib rolling tidak ditemukan");
    }
    if (!("result" in outcome)) {
      return ok(outcome.items);
    }

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_KHATIB_ROLLING_ORDER",
      entityType: "KhatibRollingSetting",
      entityId: id,
      changeSummary: `Mengubah urutan rotasi khatib ${outcome.name}`,
    });

    return ok(outcome.result);
  } catch (error) {
    console.error(error);
    return serverError("Gagal mengubah urutan khatib rolling");
  }
}
