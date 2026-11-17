import { NextRequest, NextResponse } from "next/server";
import { badRequest, parseDateOnly, serverError } from "@/lib/api";
import {
  buildReminderPlan,
  getTomorrowDateOnly,
  sendRemindersForDate,
} from "@/lib/reminder-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint cron harian pengingat H-1.
 *
 * Vercel Cron memanggil endpoint ini dengan header:
 *   Authorization: Bearer <CRON_SECRET>
 * Pengujian manual juga bisa memakai ?secret=<CRON_SECRET>.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const query = request.nextUrl.searchParams.get("secret") ?? "";
  return header === `Bearer ${secret}` || query === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const dateOnly = dateParam ? parseDateOnly(dateParam) : getTomorrowDateOnly();
    if (!dateOnly) return badRequest("Format tanggal harus yyyy-MM-dd");

    const dryRun = ["1", "true", "yes"].includes(
      (request.nextUrl.searchParams.get("dryRun") ?? "").toLowerCase()
    );

    const plan = await buildReminderPlan(dateOnly);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        date: plan.date,
        dateLabel: plan.dateLabel,
        gateway: plan.gateway,
        recipients: plan.recipients.map((recipient) => ({
          name: recipient.name,
          phone: recipient.phone,
          duties: recipient.duties.map((duty) => duty.label),
        })),
      });
    }

    if (!plan.gateway.configured) {
      return NextResponse.json(
        { error: plan.gateway.hint, gateway: plan.gateway, date: plan.date },
        { status: 503 }
      );
    }

    const { results } = await sendRemindersForDate(dateOnly, { plan });
    return NextResponse.json({
      date: plan.date,
      dateLabel: plan.dateLabel,
      sent: results.filter((result) => result.status === "SENT").length,
      skipped: results.filter((result) => result.status === "SKIPPED").length,
      failed: results.filter((result) => result.status === "FAILED").length,
      results,
    });
  } catch (error) {
    console.error("[cron] Gagal mengirim pengingat H-1:", error);
    return serverError("Gagal memproses pengingat H-1");
  }
}
