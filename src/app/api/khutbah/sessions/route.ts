import { prisma } from "@/lib/prisma";
import { autoEndExpired } from "@/lib/khutbah";
import { getSessionUser, ok, serverError, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    await autoEndExpired();
    const sessions = await prisma.khutbahSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return ok(sessions);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
