import { prisma } from "@/lib/prisma";
import { saveDisplayThemePatch } from "@/lib/settings";
import { PetugasItem } from "@/types/petugas";

export async function getPetugasList(): Promise<PetugasItem[]> {
  try {
    const display = await prisma.displaySetting.findFirst({
      orderBy: { id: "asc" },
      select: { themeSettings: true },
    });

    const theme = (display?.themeSettings as Record<string, unknown>) ?? null;
    if (theme && Array.isArray(theme.petugas) && theme.petugas.length > 0) {
      return theme.petugas as PetugasItem[];
    }

    return [];
  } catch (error) {
    console.error("Gagal membaca daftar petugas:", error);
    return [];
  }
}

export async function savePetugasList(items: PetugasItem[]): Promise<void> {
  await saveDisplayThemePatch({ petugas: items });
}
