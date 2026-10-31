import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, getSessionUser, ok, serverError, unauthorized } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return ok(users);
  } catch (error) {
    console.error(error);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!name || !email || !password) {
      return badRequest("Nama, email, dan password wajib diisi");
    }
    if (password.length < 6) {
      return badRequest("Password minimal 6 karakter");
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) return badRequest("Email sudah terdaftar");

    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: body.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN",
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await writeAudit({
      adminId: user.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: created.id,
      changeSummary: `Menambah pengguna ${created.email} (${created.role})`,
    });

    return ok(created, 201);
  } catch (error) {
    console.error(error);
    return serverError("Gagal menambah pengguna");
  }
}
