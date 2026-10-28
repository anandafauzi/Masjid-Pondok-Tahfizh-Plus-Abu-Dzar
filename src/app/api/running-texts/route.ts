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

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const items = await prisma.runningText.findMany({
      orderBy: { displayOrder: "asc" },
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
    if (!body.content || !String(body.content).trim()) {
      return badRequest("Isi running text wajib diisi");
    }

    const count = await prisma.runningText.count();
    const item = await prisma.runningText.create({
      data: {
        content: String(body.content).trim(),
        displayOrder:
          body.displayOrder !== undefined
            ? parseIntOr(body.displayOrder, count)
            : count,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "CREATE_RUNNING_TEXT",
      entityType: "RunningText",
      entityId: item.id,
      changeSummary: `Menambah running text: ${item.content.slice(0, 60)}`,
    });

    return ok(item, 201);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menambah running text");
  }
}
