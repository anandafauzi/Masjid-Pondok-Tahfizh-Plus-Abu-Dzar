export type PetugasRole = "IMAM" | "MUADZIN" | "KHATIB" | "PEMATERI" | "LAINNYA";

export interface PetugasItem {
  id: string;
  name: string;
  roles: PetugasRole[];
  phone?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export const ROLE_LABELS: Record<PetugasRole, { label: string; badgeColor: string }> = {
  IMAM: { label: "Imam Shalat", badgeColor: "bg-[#2d946e]/10 text-[#1e6149] border-[#2d946e]/30" },
  MUADZIN: { label: "Muadzin", badgeColor: "bg-[#457c6b]/10 text-[#2b594b] border-[#457c6b]/30" },
  KHATIB: { label: "Khatib Jumat", badgeColor: "bg-[#c5a059]/15 text-[#82621c] border-[#c5a059]/30" },
  PEMATERI: { label: "Pemateri Kajian", badgeColor: "bg-[#4361ee]/10 text-[#2740b0] border-[#4361ee]/30" },
  LAINNYA: { label: "Lainnya", badgeColor: "bg-slate-100 text-slate-700 border-slate-300" },
};
