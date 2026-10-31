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
import { PetugasItem, PetugasRole } from "@/types/petugas";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

const VALID_ROLES = new Set<PetugasRole>([
  "IMAM",
  "MUADZIN",
  "KHATIB",
  "PEMATERI",
  "LAINNYA",
]);

/** Validasi & normalisasi daftar petugas dari body request. */
function parsePetugasItems(raw: unknown[]): PetugasItem[] | null {
  const items: PetugasItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) return null;

    const roles = Array.isArray(item.roles)
      ? item.roles.filter(
          (role): role is PetugasRole =>
            typeof role === "string" && VALID_ROLES.has(role as PetugasRole)
        )
      : [];
    if (roles.length === 0) return null;

    items.push({
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id
          : `p-${Date.now()}-${items.length}`,
      name,
      roles,
      phone:
        typeof item.phone === "string" && item.phone.trim()
          ? item.phone.trim()
          : null,
      notes:
        typeof item.notes === "string" && item.notes.trim()
          ? item.notes.trim()
          : null,
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true,
      createdAt:
        typeof item.createdAt === "string" && item.createdAt
          ? item.createdAt
          : new Date().toISOString().slice(0, 10),
    });
  }
  return items;
}

export async function GET() {
  // Daftar petugas memuat nomor HP, jadi hanya boleh diakses admin.
  const user = await getSessionUser();
  if (!user) return unauthorized();

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
      const items = parsePetugasItems(body.items);
      if (!items) {
        return badRequest(
          "Data petugas tidak valid: nama wajib diisi dan minimal satu peran valid"
        );
      }
      await savePetugasList(items);
      await writeAudit({
        adminId: user.id,
        action: "UPDATE_PETUGAS_BULK",
        entityType: "Petugas",
        entityId: "master-petugas",
        changeSummary: `Memperbarui daftar petugas (${items.length} orang)`,
      });
      revalidateAllAppPaths();
      return ok({ success: true, count: items.length });
    }

    // Case 2: Add single petugas
    if (body.name && String(body.name).trim()) {
      const roles = Array.isArray(body.roles)
        ? body.roles.filter(
            (role: unknown): role is PetugasRole =>
              typeof role === "string" && VALID_ROLES.has(role as PetugasRole)
          )
        : [];
      const existing = await getPetugasList();
      const newPetugas: PetugasItem = {
        id: `p-${Date.now()}`,
        name: String(body.name).trim(),
        roles: roles.length > 0 ? roles : ["IMAM"],
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

