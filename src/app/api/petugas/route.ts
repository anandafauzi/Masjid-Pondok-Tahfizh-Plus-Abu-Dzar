import { NextRequest } from "next/server";
import {
  badRequest,
  getSessionUser,
  ok,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getPetugasList, savePetugasList } from "@/lib/petugas";
import { PetugasItem } from "@/types/petugas";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getPetugasList();
    return ok(items);
  } catch (error) {
    console.error("Gagal mengambil data petugas:", error);
    return serverError("Gagal mengambil data petugas");
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    if (!body) return badRequest("Data tidak valid");

    // Case 1: Bulk update
    if (Array.isArray(body.items)) {
      await savePetugasList(body.items as PetugasItem[]);
      await writeAudit({
        adminId: user.id,
        action: "UPDATE_PETUGAS_BULK",
        entityType: "Petugas",
        entityId: "master-petugas",
        changeSummary: `Memperbarui daftar petugas (${body.items.length} orang)`,
      });
      revalidateAllAppPaths();
      return ok({ success: true, count: body.items.length });
    }

    // Case 2: Add single petugas
    if (body.name && String(body.name).trim()) {
      const existing = await getPetugasList();
      const newPetugas: PetugasItem = {
        id: `p-${Date.now()}`,
        name: String(body.name).trim(),
        roles: Array.isArray(body.roles) && body.roles.length > 0 ? body.roles : ["IMAM"],
        phone: body.phone ? String(body.phone).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      const updated = [newPetugas, ...existing];
      await savePetugasList(updated);

      await writeAudit({
        adminId: user.id,
        action: "CREATE_PETUGAS",
        entityType: "Petugas",
        entityId: newPetugas.id,
        changeSummary: `Menambah petugas: ${newPetugas.name} (${newPetugas.roles.join(", ")})`,
      });

      revalidateAllAppPaths();

      return ok(newPetugas, 201);
    }

    return badRequest("Nama petugas wajib diisi");
  } catch (error) {
    console.error("Gagal menyimpan petugas:", error);
    return serverError("Gagal menyimpan petugas");
  }
}

