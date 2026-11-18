import { NextRequest } from "next/server";
import { badRequest, getSessionUser, ok, serverError, unauthorized } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { normalizeReminderSettings } from "@/lib/reminder-settings";
import {
  getReminderSettings,
  saveReminderSettings,
} from "@/lib/reminder-settings-store";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    return ok(await getReminderSettings());
  } catch (error) {
    console.error("[admin] Gagal membaca pengaturan pengingat:", error);
    return serverError("Gagal membaca pengaturan pengingat");
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return badRequest("Data pengaturan tidak valid");

    const settings = normalizeReminderSettings({
      offsetDays: body.offsetDays,
      sendTime: body.sendTime,
      imamTemplate: body.imamTemplate,
      khatibTemplate: body.khatibTemplate,
    });

    await saveReminderSettings(settings);
    await writeAudit({
      adminId: user.id,
      action: "UPDATE_REMINDER_SETTINGS",
      entityType: "ReminderSettings",
      entityId: "default",
      changeSummary: `H-${settings.offsetDays} jam ${settings.sendTime} WIB; template imam & khatib diperbarui`,
    });
    revalidateAllAppPaths();

    return ok(settings);
  } catch (error) {
    console.error("[admin] Gagal menyimpan pengaturan pengingat:", error);
    return serverError("Gagal menyimpan pengaturan pengingat");
  }
}
