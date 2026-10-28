import { prisma } from "@/lib/prisma";
import { getSessionUser, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        admin: { select: { name: true, email: true } },
      },
    });
    return ok(logs);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
