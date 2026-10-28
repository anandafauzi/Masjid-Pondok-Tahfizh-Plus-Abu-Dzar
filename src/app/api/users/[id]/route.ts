import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { badRequest, getSessionUser, ok, serverError, unauthorized } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function guard() {
  const user = await getSessionUser();
  if (!user) return { error: unauthorized() as NextResponse, user: null };
  if (user.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "Akses ditolak" }, { status: 403 }),
      user: null,
    };
  }
  return { error: null, user };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await guard();
  if (error || !user) return error ?? unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();

    if (id === user.id) {
      if (body.isActive === false) {
        return badRequest("Tidak dapat menonaktifkan akun sendiri");
      }
      if (body.role && body.role !== "SUPER_ADMIN") {
        return badRequest("Tidak dapat menurunkan peran akun sendiri");
      }
    }

    if (
      body.role !== undefined &&
      body.role !== "ADMIN" &&
      body.role !== "SUPER_ADMIN"
    ) {
      return badRequest("Peran tidak valid");
    }
    if (body.password !== undefined && String(body.password).length < 6) {
      return badRequest("Password minimal 6 karakter");
    }

    const data: Record<string, unknown> = {
      name: body.name ?? undefined,
      role: body.role ?? undefined,
      isActive:
        body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    };
    if (body.password) {
      data.password = await bcrypt.hash(String(body.password), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
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
      action: "UPDATE_USER",
      entityType: "User",
      entityId: updated.id,
      changeSummary: `Memperbarui pengguna ${updated.email}`,
    });

    return ok(updated);
  } catch (err) {
    console.error(err);
    return serverError("Gagal memperbarui pengguna");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await guard();
  if (error || !user) return error ?? unauthorized();

  try {
    const { id } = await params;
    if (id === user.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun sendiri" },
        { status: 400 }
      );
    }
    await prisma.user.delete({ where: { id } });
    await writeAudit({
      adminId: user.id,
      action: "DELETE_USER",
      entityType: "User",
      entityId: id,
      changeSummary: "Menghapus pengguna",
    });
    return ok({ success: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return badRequest(
        "Pengguna masih memiliki riwayat aktivitas. Nonaktifkan akun ini alih-alih menghapusnya."
      );
    }
    console.error(err);
    return serverError("Gagal menghapus pengguna");
  }
}
