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

async function withSerializableRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isP2034 =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2034";
      if (isP2034 && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, attempt * 50 + Math.random() * 50));
        continue;
      }
      throw error;
    }
  }
}

export async function startKhutbah(input: StartKhutbahInput) {
  const duration = input.durationMinutes ?? 40;
  const startMode = input.startMode ?? "MANUAL";

  return withSerializableRetry(() =>
    prisma.$transaction(
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
    )
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
  const now = new Date();

  // Jika sesi sudah melewati endsAt semula, perpanjang dihitung dari waktu sekarang agar tetap aktif
  const baseTime = session.endsAt.getTime() > now.getTime() ? session.endsAt : now;
  const newEndsAt = addMinutes(baseTime, extraMinutes);

  // Perbarui total durationMinutes agar konsisten dengan waktu selesai yang baru
  const calculatedDuration = Math.max(
    session.durationMinutes,
    Math.round((newEndsAt.getTime() - session.startedAt.getTime()) / 60000)
  );

  return prisma.khutbahSession.update({
    where: { id: session.id },
    data: {
      endsAt: newEndsAt,
      durationMinutes: calculatedDuration,
    },
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
