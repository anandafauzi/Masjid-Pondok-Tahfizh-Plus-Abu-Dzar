import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PetugasItem } from "@/types/petugas";

export const DEFAULT_PETUGAS_LIST: PetugasItem[] = [];

export async function getPetugasList(): Promise<PetugasItem[]> {
  try {
    const display = await prisma.displaySetting.findFirst({
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
  const display = await prisma.displaySetting.findFirst({
    select: { id: true, themeSettings: true },
  });

  const existingTheme =
    (display?.themeSettings as Record<string, unknown>) ?? {};
  const newTheme = {
    ...existingTheme,
    petugas: items,
  };

  if (display) {
    await prisma.displaySetting.update({
      where: { id: display.id },
      data: { themeSettings: newTheme as unknown as Prisma.InputJsonValue },
    });
  }
}
