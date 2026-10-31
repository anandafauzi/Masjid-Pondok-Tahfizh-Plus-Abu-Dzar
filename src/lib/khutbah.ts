import { prisma } from "@/lib/prisma";
import { addMinutes } from "@/lib/datetime";

export interface StartKhutbahInput {
  fridayDate: Date;
  khatibName: string;
  sermonTopic?: string | null;
  durationMinutes?: number;
  startMode?: "MANUAL" | "AUTO";
  scheduledStartAt?: Date | null;
  startedById?: string | null;
}

export class KhutbahConflictError extends Error {
  constructor(
    message = "Sudah ada sesi khutbah yang aktif atau terjadwal. Batalkan sesi tersebut terlebih dahulu."
  ) {
    super(message);
    this.name = "KhutbahConflictError";
  }
}

export class KhutbahStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KhutbahStateError";
  }
}

async function getActiveSessionOrThrow(id: string) {
  const session = await prisma.khutbahSession.findUnique({ where: { id } });
  if (!session) throw new KhutbahStateError("Sesi khutbah tidak ditemukan");
  if (session.status !== "ACTIVE") {
    throw new KhutbahStateError("Sesi khutbah sudah tidak aktif");
  }
  return session;
}

/** Mark any ACTIVE session whose endsAt has passed as ENDED. */
export async function autoEndExpired(now: Date = new Date()) {
  return prisma.khutbahSession.updateMany({
    where: { status: "ACTIVE", endsAt: { lt: now } },
    data: { status: "ENDED", endedAt: now },
  });
}

/**
 * Returns the single currently active khutbah session, or null.
 * Automatically closes expired sessions and respects AUTO start times.
 */
export async function getActiveKhutbah(now: Date = new Date()) {
  await autoEndExpired(now);

  const session = await prisma.khutbahSession.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
  });

  if (!session) return null;

  if (session.startMode === "AUTO" && session.startedAt.getTime() > now.getTime()) {
    return null;
  }

  return session;
}

export async function startKhutbah(input: StartKhutbahInput) {
  const duration = input.durationMinutes ?? 40;
  const startMode = input.startMode ?? "MANUAL";

  return prisma.$transaction(
    async (tx) => {
      const now = new Date();

      await tx.khutbahSession.updateMany({
        where: { status: "ACTIVE", endsAt: { lt: now } },
        data: { status: "ENDED", endedAt: now },
      });

      const existing = await tx.khutbahSession.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      });

      if (existing) {
        throw new KhutbahConflictError(
          existing.startedAt.getTime() > now.getTime()
            ? "Masih ada sesi khutbah terjadwal. Batalkan jadwal tersebut di menu Khutbah Jumat terlebih dahulu."
            : undefined
        );
      }

      const startAt =
        startMode === "AUTO" && input.scheduledStartAt
          ? input.scheduledStartAt
          : now;

      const endsAt = addMinutes(startAt, duration);

      return tx.khutbahSession.create({
        data: {
          fridayDate: input.fridayDate,
          khatibName: input.khatibName,
          sermonTopic: input.sermonTopic ?? null,
          durationMinutes: duration,
          startMode,
          scheduledStartAt: input.scheduledStartAt ?? null,
          startedAt: startAt,
          endsAt,
          status: "ACTIVE",
          startedById: input.startedById ?? null,
        },
      });
    },
    { isolationLevel: "Serializable" }
  );
}

export async function endKhutbah(id: string, endedById?: string | null) {
  const session = await getActiveSessionOrThrow(id);
  const now = new Date();
  return prisma.khutbahSession.update({
    where: { id: session.id },
    data: { status: "ENDED", endedAt: now, endedById: endedById ?? null },
  });
}

export async function extendKhutbah(id: string, extraMinutes: number) {
  const session = await getActiveSessionOrThrow(id);

  const newEndsAt = addMinutes(session.endsAt, extraMinutes);
  return prisma.khutbahSession.update({
    where: { id: session.id },
    data: { endsAt: newEndsAt },
  });
}

export async function cancelKhutbah(id: string, endedById?: string | null) {
  const session = await getActiveSessionOrThrow(id);
  const now = new Date();
  return prisma.khutbahSession.update({
    where: { id: session.id },
    data: { status: "CANCELLED", endedAt: now, endedById: endedById ?? null },
  });
}
