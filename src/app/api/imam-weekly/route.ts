import { NextRequest } from "next/server";
import { revalidateAllAppPaths } from "@/lib/revalidate";
import {
  badRequest,
  getSessionUser,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import {
  getWeeklyImamSettings,
  saveWeeklyImamSettings,
  WeeklyImamItem,
  PRAYERS,
} from "@/lib/weekly-imam";

export const dynamic = "force-dynamic";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Validasi & normalisasi jadwal imam pekanan dari body request. */
function parseWeeklyItems(raw: unknown[]): WeeklyImamItem[] | null {
  const items: WeeklyImamItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;

    const dayOfWeek = Number(item.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return null;
    }

    const prayerName =
      typeof item.prayerName === "string" ? item.prayerName.trim() : "";
    if (!PRAYERS.includes(prayerName as (typeof PRAYERS)[number])) {
      return null;
    }

    const imamName =
      typeof item.imamName === "string" ? item.imamName.trim() : "";
    const isActive = item.isActive !== undefined ? Boolean(item.isActive) : true;
    if (isActive && !imamName) return null;

    const effectiveFrom =
      typeof item.effectiveFrom === "string" ? item.effectiveFrom.trim() : "";
    if (effectiveFrom && !DATE_ONLY.test(effectiveFrom)) return null;

    const effectiveUntil =
      typeof item.effectiveUntil === "string" && item.effectiveUntil.trim()
        ? item.effectiveUntil.trim()
        : null;
    if (effectiveUntil && !DATE_ONLY.test(effectiveUntil)) return null;

    items.push({
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id
          : `weekly-${dayOfWeek}-${prayerName}`,
      dayOfWeek,
      prayerName,
      imamName,
      muadzinName:
        typeof item.muadzinName === "string" ? item.muadzinName.trim() : "",
      isPermanent: Boolean(item.isPermanent),
      effectiveFrom,
      effectiveUntil,
      notes:
        typeof item.notes === "string" && item.notes.trim()
          ? item.notes.trim()
          : null,
      isActive,
    });
  }
  return items;
}

export async function GET() {
  try {
    const items = await getWeeklyImamSettings();
    return ok(items);
  } catch (error) {
    console.error("Gagal mengambil jadwal imam pekanan:", error);
    return serverError("Gagal mengambil jadwal imam pekanan");
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.items)) {
      return badRequest("Format data jadwal pekanan tidak valid");
    }

    const items = parseWeeklyItems(body.items);
    if (!items) {
      return badRequest(
        "Data jadwal pekanan tidak valid: periksa hari, nama shalat, dan nama imam"
      );
    }
    const syncDays =
      typeof body.syncDays === "number" && Number.isFinite(body.syncDays)
        ? Math.max(0, Math.min(Math.trunc(body.syncDays), 14))
        : 14;

    await saveWeeklyImamSettings(items, syncDays);

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_WEEKLY_IMAM",
      entityType: "WeeklyImamSchedule",
      entityId: "weekly-imam",
      changeSummary: `Memperbarui ${items.length} jadwal imam pekanan (Opsi: Tetap Selamanya / Terjadwal)`,
    });

    revalidateAllAppPaths();

    return ok({ success: true, count: items.length });
  } catch (error) {
    console.error("Gagal menyimpan jadwal imam pekanan:", error);
    return serverError("Gagal menyimpan jadwal imam pekanan");
  }
}

