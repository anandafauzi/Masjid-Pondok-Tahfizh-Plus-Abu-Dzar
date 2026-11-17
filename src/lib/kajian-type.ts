import type { KajianType } from "@/lib/kajian";

export const KAJIAN_TYPES: KajianType[] = ["REGULAR", "LIBUR", "KHUSUS"];

export function isKajianType(value: unknown): value is KajianType {
  return typeof value === "string" && KAJIAN_TYPES.includes(value as KajianType);
}

export function parseKajianType(value: unknown): KajianType {
  return isKajianType(value) ? value : "REGULAR";
}

export function kajianTypeLabel(type: KajianType): string {
  if (type === "LIBUR") return "Libur";
  if (type === "KHUSUS") return "Kajian Khusus";
  return "Kajian Rutin";
}
