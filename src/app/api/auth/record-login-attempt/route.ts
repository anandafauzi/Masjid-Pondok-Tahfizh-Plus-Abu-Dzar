import { NextRequest, NextResponse } from "next/server";
import { recordLoginAttempt } from "@/lib/login-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const success = Boolean(body.success);
    const userAgent = request.headers.get("user-agent");
    if (email) {
      await recordLoginAttempt(email, success, request, userAgent);
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[RECORD_LOGIN] Failed:", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
