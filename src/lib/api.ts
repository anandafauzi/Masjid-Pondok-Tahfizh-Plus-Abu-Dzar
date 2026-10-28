import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnlyToUTC } from "@/lib/datetime";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Re-check the database so deactivated accounts lose access immediately
  // instead of remaining valid until their JWT expires.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  if (!user?.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Data tidak ditemukan") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Terjadi kesalahan pada server") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** Convert a yyyy-MM-dd string from a request into a @db.Date value. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = dateOnlyToUTC(value);
  if (Number.isNaN(parsed.getTime())) return null;

  // Reject roll-over dates such as 2025-02-31.
  if (parsed.toISOString().slice(0, 10) !== value) return null;

  return parsed;
}

export function parseIntOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
