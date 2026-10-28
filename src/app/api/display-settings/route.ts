import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, ok, serverError, unauthorized } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const settings = await prisma.displaySetting.findFirst();
    return ok(settings);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const interval = Number(body.slideIntervalSeconds);
    const speed = Number(body.tickerSpeed);
    const data = {
      slideIntervalSeconds:
        body.slideIntervalSeconds !== undefined && Number.isFinite(interval)
          ? Math.min(Math.max(Math.trunc(interval), 3), 120)
          : undefined,
      autoRotateEnabled:
        body.autoRotateEnabled !== undefined
          ? Boolean(body.autoRotateEnabled)
          : undefined,
      tickerSpeed:
        body.tickerSpeed !== undefined && Number.isFinite(speed)
          ? Math.min(Math.max(Math.trunc(speed), 10), 200)
          : undefined,
      tickerEnabled:
        body.tickerEnabled !== undefined
          ? Boolean(body.tickerEnabled)
          : undefined,
      showHijriDate:
        body.showHijriDate !== undefined
          ? Boolean(body.showHijriDate)
          : undefined,
      themeSettings:
        body.themeSettings !== undefined ? body.themeSettings : undefined,
    };

    const existing = await prisma.displaySetting.findFirst();
    const settings = existing
      ? await prisma.displaySetting.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.displaySetting.create({
          data: { id: "default", ...data },
        });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_DISPLAY_SETTINGS",
      entityType: "DisplaySetting",
      entityId: settings.id,
      changeSummary: "Memperbarui pengaturan tampilan TV",
    });

    return ok(settings);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menyimpan pengaturan tampilan");
  }
}
