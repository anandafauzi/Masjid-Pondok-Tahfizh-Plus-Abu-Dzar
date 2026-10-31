import { NextRequest, NextResponse } from "next/server";
import { isLoginRateLimited } from "@/lib/login-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    if (!email) {
      return NextResponse.json({ limited: false }, { status: 200 });
    }
    const result = await isLoginRateLimited(email, request);
    if (result.limited) {
      return NextResponse.json(
        { limited: true, retryAfterSeconds: result.retryAfterSeconds },
        { status: 429 }
      );
    }
    return NextResponse.json({ limited: false }, { status: 200 });
  } catch (error) {
    console.error("[LOGIN_RATE_LIMIT] Check failed:", error);
    return NextResponse.json({ limited: false }, { status: 200 });
  }
}
