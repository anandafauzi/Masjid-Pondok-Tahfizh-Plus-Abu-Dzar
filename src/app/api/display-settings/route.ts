import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  ok,
  readJsonBody,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";
import { saveDisplayThemePatch } from "@/lib/settings";
import { normalizeShalatScreenDurationMinutes } from "@/lib/tv-display-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const settings = await prisma.displaySetting.findFirst({
      orderBy: { id: "asc" },
    });
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
    const body = await readJsonBody(request);
    if (!body) return badRequest("Format data tidak valid");
    const interval = Number(body.slideIntervalSeconds);
    const speed = Number(body.tickerSpeed);
    const existing = await prisma.displaySetting.findFirst({
      orderBy: { id: "asc" },
    });

    const themePayload =
      body.themeSettings &&
      typeof body.themeSettings === "object" &&
      !Array.isArray(body.themeSettings)
        ? (body.themeSettings as Record<string, unknown>)
        : null;

    if (themePayload?.shalatScreenDurationMinutes !== undefined) {
      themePayload.shalatScreenDurationMinutes =
        normalizeShalatScreenDurationMinutes(
          themePayload.shalatScreenDurationMinutes,
        );
    }

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
    };

    const settings = existing
      ? await prisma.displaySetting.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.displaySetting.create({
          data: { id: "default", ...data },
        });

    // Merge atomik di DB supaya kunci themeSettings milik fitur lain tidak
    // hilang saat halaman ini disimpan bersamaan dengan petugas/pengingat.
    if (themePayload) {
      await saveDisplayThemePatch(themePayload);
    }

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_DISPLAY_SETTINGS",
      entityType: "DisplaySetting",
      entityId: settings.id,
      changeSummary: "Memperbarui pengaturan tampilan TV",
    });

    revalidateAllAppPaths();

    return ok(settings);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menyimpan pengaturan tampilan");
  }
}
