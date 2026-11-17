import { NextRequest, NextResponse } from "next/server";
import {
  badRequest,
  getSessionUser,
  ok,
  parseDateOnly,
  serverError,
  unauthorized,
} from "@/lib/api";
import {
  buildReminderPlan,
  getTomorrowDateOnly,
  sendRemindersForDate,
} from "@/lib/reminder-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Pratinjau penerima pengingat H-1 untuk tanggal tertentu. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const dateOnly = dateParam ? parseDateOnly(dateParam) : getTomorrowDateOnly();
    if (!dateOnly) return badRequest("Format tanggal harus yyyy-MM-dd");

    const plan = await buildReminderPlan(dateOnly);
    return ok(plan);
  } catch (error) {
    console.error("[admin] Gagal menyiapkan pratinjau pengingat:", error);
    return serverError("Gagal memuat data pengingat");
  }
}

/** Kirim pengingat manual untuk semua penerima atau penerima terpilih. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = (await request.json().catch(() => ({}))) as {
      date?: string;
      dedupeKeys?: unknown;
      force?: unknown;
    };

    const dateOnly = body.date ? parseDateOnly(body.date) : getTomorrowDateOnly();
    if (!dateOnly) return badRequest("Format tanggal harus yyyy-MM-dd");

    const dedupeKeys = Array.isArray(body.dedupeKeys)
      ? body.dedupeKeys.filter((key): key is string => typeof key === "string")
      : undefined;
    const force = body.force === true;

    const plan = await buildReminderPlan(dateOnly);
    if (!plan.recipients.length) {
      return ok({ results: [], plan });
    }

    if (!plan.gateway.configured) {
      return NextResponse.json(
        { error: plan.gateway.hint, gateway: plan.gateway, plan },
        { status: 503 }
      );
    }

    const { results } = await sendRemindersForDate(dateOnly, { plan, dedupeKeys, force });
    const refreshed = await buildReminderPlan(dateOnly);
    return ok({ results, plan: refreshed });
  } catch (error) {
    console.error("[admin] Gagal mengirim pengingat:", error);
    return serverError("Gagal mengirim pengingat WhatsApp");
  }
}
