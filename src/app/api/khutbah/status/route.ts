import { getActiveKhutbah } from "@/lib/khutbah";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

function serializeSession(session: {
  id: string;
  fridayDate: Date;
  khatibName: string;
  sermonTopic: string | null;
  status: string;
  startMode: string;
  startedAt: Date;
  endsAt: Date;
  durationMinutes: number;
}) {
  return {
    id: session.id,
    fridayDate: session.fridayDate,
    khatibName: session.khatibName,
    sermonTopic: session.sermonTopic,
    status: session.status,
    startMode: session.startMode,
    startedAt: session.startedAt,
    endsAt: session.endsAt,
    durationMinutes: session.durationMinutes,
  };
}

export async function GET() {
  try {
    const now = new Date();
    const active = await getActiveKhutbah(now);
    const scheduled = active
      ? null
      : await prisma.khutbahSession.findFirst({
          where: { status: "ACTIVE", startedAt: { gt: now } },
          orderBy: { startedAt: "asc" },
        });

    return ok({
      active: Boolean(active),
      serverTime: now.toISOString(),
      session: active ? serializeSession(active) : null,
      scheduled: scheduled ? serializeSession(scheduled) : null,
    });
  } catch (error) {
    console.error(error);
    return serverError();
  }
}
