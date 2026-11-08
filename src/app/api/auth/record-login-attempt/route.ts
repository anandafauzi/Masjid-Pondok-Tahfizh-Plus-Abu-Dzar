import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DEPRECATED & DISABLED:
 * Pencatatan login attempt kini dilakukan langsung di server-side (authorize() di src/lib/auth.ts)
 * untuk mencegah DoS lockout eksploitasi oleh pihak ketiga yang tidak terautentikasi.
 */
export async function POST() {
  return NextResponse.json(
    { message: "Endpoint ini telah dinonaktifkan demi keamanan. Login attempt dicatat server-side." },
    { status: 200 }
  );
}
