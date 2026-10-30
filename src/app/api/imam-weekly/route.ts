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
} from "@/lib/weekly-imam";

export const dynamic = "force-dynamic";

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

    const items = body.items as WeeklyImamItem[];
    const syncDays = typeof body.syncDays === "number" ? Math.min(body.syncDays, 14) : 14;

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

