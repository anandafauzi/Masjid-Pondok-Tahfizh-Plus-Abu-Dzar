import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PetugasItem } from "@/types/petugas";

export const DEFAULT_PETUGAS_LIST: PetugasItem[] = [
  // Asatidz Imam & Khatib
  { id: "p-1", name: "Ust. Abdullah Mundzir", roles: ["IMAM", "KHATIB", "PEMATERI"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-2", name: "Ust. Nadzful Zuliano Manaf", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-3", name: "Ust. Muhammad Nanda Fauzi", roles: ["IMAM", "KHATIB", "PEMATERI"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-4", name: "Ust. Muhandis Abdullah Alkaf", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-5", name: "Ustadz Daud Ridhwan", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-6", name: "Ust. Ahmad Alwan", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-7", name: "Ust. Abdurrahman Azhar", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-8", name: "Ust. Sutio Syahrulleanggi", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-9", name: "Ust. Rahmatul Ula Husnurrijal", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-10", name: "Ustadz Adlan Habiburrahman", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-11", name: "Ust. Ibrohim", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-12", name: "Ust. Bagus Herlianto", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-13", name: "Ust. Farhan Abdillah", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-14", name: "Ust. Muhammad Azzam", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-15", name: "Ust. Hafidz Munawar", roles: ["IMAM", "KHATIB"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-16", name: "Ust. Dr. Hasan Basri, Lc., M.A.", roles: ["KHATIB", "PEMATERI"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-17", name: "Ust. Ahmad Fauzi", roles: ["IMAM", "KHATIB", "PEMATERI"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-18", name: "Asatidz / Musyrif", roles: ["IMAM"], isActive: true, createdAt: "2026-10-28" },

  // Santri & Petugas Muadzin / Imam
  { id: "p-19", name: "Satria Rupawan", roles: ["IMAM", "MUADZIN"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-20", name: "Albar Abdul Malik", roles: ["IMAM", "MUADZIN"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-21", name: "Fatih / Hiraki", roles: ["MUADZIN"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-22", name: "Fauzan / Fadgham", roles: ["MUADZIN"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-23", name: "Albar / Muhammad", roles: ["MUADZIN"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-24", name: "Baraka / Satria", roles: ["MUADZIN"], isActive: true, createdAt: "2026-10-28" },
  { id: "p-25", name: "Fadgham / Taqiyuddin", roles: ["MUADZIN"], isActive: true, createdAt: "2026-10-28" },
];

export async function getPetugasList(): Promise<PetugasItem[]> {
  try {
    const display = await prisma.displaySetting.findFirst({
      select: { themeSettings: true },
    });

    const theme = (display?.themeSettings as Record<string, unknown>) ?? null;
    if (theme && Array.isArray(theme.petugas) && theme.petugas.length > 0) {
      return theme.petugas as PetugasItem[];
    }

    return DEFAULT_PETUGAS_LIST;
  } catch (error) {
    console.error("Gagal membaca daftar petugas:", error);
    return DEFAULT_PETUGAS_LIST;
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
