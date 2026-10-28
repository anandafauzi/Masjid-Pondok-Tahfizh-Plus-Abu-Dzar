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

const VERIFICATION_STATUSES = new Set([
  "VERIFIED",
  "UNVERIFIED",
  "NEEDS_REVIEW",
]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const items = await prisma.islamicAdvice.findMany({
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
      return badRequest("Isi nasihat wajib diisi");
    }

    const verificationStatus =
      body.verificationStatus === undefined
        ? "UNVERIFIED"
        : String(body.verificationStatus);
    if (!VERIFICATION_STATUSES.has(verificationStatus)) {
      return badRequest("Status verifikasi tidak valid");
    }

    const count = await prisma.islamicAdvice.count();
    const item = await prisma.islamicAdvice.create({
      data: {
        content: String(body.content).trim(),
        sourceReference:
          body.sourceReference != null ? String(body.sourceReference) : null,
        authorOrSource:
          body.authorOrSource != null ? String(body.authorOrSource) : null,
        verificationStatus,
        displayOrder:
          body.displayOrder !== undefined
            ? parseIntOr(body.displayOrder, count)
            : count,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "CREATE_ADVICE",
      entityType: "IslamicAdvice",
      entityId: item.id,
      changeSummary: "Menambah nasihat islami",
    });

    return ok(item, 201);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menambah nasihat");
  }
}
