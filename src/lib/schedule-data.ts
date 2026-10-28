import { prisma } from "@/lib/prisma";

export async function getRunningTextsSafe() {
  try {
    return await prisma.runningText.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getAdviceSafe() {
  try {
    return await prisma.islamicAdvice.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getImamSchedulesBetween(from: Date, to: Date) {
  try {
    return await prisma.imamMuadzinSchedule.findMany({
      where: { scheduleDate: { gte: from, lte: to } },
      orderBy: [{ scheduleDate: "asc" }, { prayerName: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getUpcomingKhatibSchedules(from: Date, take = 4) {
  try {
    return await prisma.khatibSchedule.findMany({
      where: { fridayDate: { gte: from } },
      orderBy: { fridayDate: "asc" },
      take,
    });
  } catch {
    return [];
  }
}

export async function getUpcomingKajian(from: Date, take = 6) {
  try {
    return await prisma.kajianSchedule.findMany({
      where: { startDateTime: { gte: from }, isActive: true },
      orderBy: { startDateTime: "asc" },
      take,
    });
  } catch {
    return [];
  }
}

export const getKajianSafe = getUpcomingKajian;

export async function getKhatibScheduleForDate(fridayDate: Date) {
  try {
    return await prisma.khatibSchedule.findFirst({ where: { fridayDate } });
  } catch {
    return null;
  }
}

export async function getImamRollingActive() {
  try {
    return await prisma.imamRollingSetting.findMany({
      where: { isActive: true },
      orderBy: [{ sequenceNumber: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getKhatibRollingActive() {
  try {
    return await prisma.khatibRollingSetting.findMany({
      where: { isActive: true },
      orderBy: [{ sequenceNumber: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    });
  } catch {
    return [];
  }
}

/** Next Friday (today if it is Friday), as a @db.Date UTC-midnight value. */
export function nextFriday(dateOnly: Date): Date {
  const d = new Date(dateOnly);
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (5 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}
