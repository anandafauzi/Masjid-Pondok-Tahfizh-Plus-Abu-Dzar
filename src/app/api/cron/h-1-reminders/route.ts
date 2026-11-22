import { NextRequest, NextResponse } from "next/server";
import { parseDateOnly, serverError } from "@/lib/api";
import {
  buildReminderPlan,
  getReminderTargetDateOnly,
  sendRemindersForDate,
} from "@/lib/reminder-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint cron harian pengingat H-1.
 *
 * Satu-satunya cara autentikasi adalah header:
 *   Authorization: Bearer <CRON_SECRET>
 * Query ?secret= sengaja tidak didukung agar kredensial tidak bocor di URL,
 * log proxy, atau riwayat browser.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

/** Semua respons cron tidak boleh di-cache (termasuk error dan dryRun). */
function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return noStore(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    );
  }

  try {
    const dateParam = request.nextUrl.searchParams.get("date");
    const dateOnly = dateParam ? parseDateOnly(dateParam) : await getReminderTargetDateOnly();
    if (!dateOnly) {
      return noStore(
        NextResponse.json(
          { error: "Format tanggal harus yyyy-MM-dd" },
          { status: 400 }
        )
      );
    }

    const dryRun = ["1", "true", "yes"].includes(
      (request.nextUrl.searchParams.get("dryRun") ?? "").toLowerCase()
    );

    const plan = await buildReminderPlan(dateOnly);

    if (dryRun) {
      return noStore(
        NextResponse.json({
          dryRun: true,
          date: plan.date,
          dateLabel: plan.dateLabel,
          email: plan.email,
          settings: plan.settings,
          recipients: plan.recipients.map((recipient) => ({
            name: recipient.name,
            email: recipient.email,
            duties: recipient.duties.map((duty) => duty.label),
          })),
        })
      );
    }

    if (!plan.email.configured) {
      return noStore(
        NextResponse.json(
          { error: plan.email.hint, email: plan.email, date: plan.date },
          { status: 503 }
        )
      );
    }

    const { results } = await sendRemindersForDate(dateOnly, { plan });
    return noStore(
      NextResponse.json({
        date: plan.date,
        dateLabel: plan.dateLabel,
        sent: results.filter((result) => result.status === "SENT").length,
        skipped: results.filter((result) => result.status === "SKIPPED").length,
        failed: results.filter((result) => result.status === "FAILED").length,
        results,
      })
    );
  } catch (error) {
    console.error("[cron] Gagal mengirim pengingat H-1:", error);
    return noStore(serverError("Gagal memproses pengingat H-1"));
  }
}
