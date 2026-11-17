import type { PetugasItem } from "@/types/petugas";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

export type ReminderDutyRole = "IMAM" | "MUADZIN" | "KHATIB";

/** Satu penugasan mentah dari jadwal (belum dicocokkan dengan data petugas). */
export interface DutyAssignment {
  role: ReminderDutyRole;
  prayerName: string | null;
  personName: string;
}

export interface ReminderDuty {
  role: ReminderDutyRole;
  prayerName: string | null;
  label: string;
  personName: string;
  matched: boolean;
}

export interface ReminderRecipient {
  dedupeKey: string;
  name: string;
  phone: string | null;
  rawPhone: string | null;
  duties: ReminderDuty[];
  roles: ReminderDutyRole[];
  message: string;
}

const PLACEHOLDER_NAMES = new Set([
  "",
  "-",
  "belum ditentukan",
  "belum ada",
  "asatidzah pondok",
  "santri bertugas",
]);

const HONORIFICS = new Set([
  "ustadz",
  "ustad",
  "ust",
  "kh",
  "hj",
  "h",
  "bapak",
  "bpk",
  "ibu",
  "pak",
  "bu",
  "dr",
  "drs",
]);

/** Samakan nama jadwal dengan nama di Data Petugas (abaikan gelar umum). */
export function normalizePersonName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !HONORIFICS.has(token))
    .join(" ")
    .trim();
}

export function isPlaceholderName(value: string | null | undefined): boolean {
  return PLACEHOLDER_NAMES.has(normalizePersonName(value));
}

export function dutyLabel(role: ReminderDutyRole, prayerName: string | null): string {
  if (role === "KHATIB") return "Khatib Jumat";
  const prefix = role === "IMAM" ? "Imam" : "Muadzin";
  return prayerName ? `${prefix} ${prayerName}` : prefix;
}

/**
 * Cari petugas yang cocok. Prioritas: nama sama + peran sama, lalu nama sama
 * pada peran apa pun (mis. merangkap imam & muadzin).
 */
export function findPetugasForName(
  name: string,
  role: ReminderDutyRole,
  petugas: PetugasItem[]
): PetugasItem | null {
  const target = normalizePersonName(name);
  if (!target) return null;

  const active = petugas.filter((item) => item.isActive !== false);
  const roleMatches = active.filter((item) => item.roles?.includes(role));

  const inRole = roleMatches.find((item) => normalizePersonName(item.name) === target);
  if (inRole) return inRole;

  return active.find((item) => normalizePersonName(item.name) === target) ?? null;
}

export function buildReminderRecipients({
  dateYmd,
  dateLabel,
  mosqueName,
  assignments,
  petugas,
}: {
  dateYmd: string;
  dateLabel: string;
  mosqueName: string;
  assignments: DutyAssignment[];
  petugas: PetugasItem[];
}): ReminderRecipient[] {
  interface Draft {
    key: string;
    name: string;
    rawPhone: string | null;
    duties: ReminderDuty[];
  }

  const drafts = new Map<string, Draft>();

  for (const assignment of assignments) {
    const rawName = assignment.personName?.trim() ?? "";
    if (isPlaceholderName(rawName)) continue;

    const match = findPetugasForName(rawName, assignment.role, petugas);
    const personKey = match?.id ?? `name:${normalizePersonName(rawName)}`;
    const duty: ReminderDuty = {
      role: assignment.role,
      prayerName: assignment.prayerName,
      label: dutyLabel(assignment.role, assignment.prayerName),
      personName: rawName,
      matched: Boolean(match),
    };

    const existing = drafts.get(personKey);
    if (existing) {
      if (!existing.duties.some((item) => item.label === duty.label)) {
        existing.duties.push(duty);
      }
      continue;
    }

    drafts.set(personKey, {
      key: personKey,
      name: match?.name?.trim() || rawName,
      rawPhone: match?.phone?.trim() || null,
      duties: [duty],
    });
  }

  // Gabungkan orang berbeda yang memakai nomor WhatsApp yang sama agar tidak
  // menerima dua pesan terpisah untuk tanggal yang sama.
  const merged = new Map<
    string,
    { names: string[]; phone: string; rawPhone: string | null; duties: ReminderDuty[] }
  >();
  const withoutPhone: ReminderRecipient[] = [];

  for (const draft of drafts.values()) {
    const normalized = normalizeWhatsAppNumber(draft.rawPhone);
    if (!normalized) {
      withoutPhone.push({
        dedupeKey: `${dateYmd}:nophone:${draft.key}`,
        name: draft.name,
        phone: null,
        rawPhone: draft.rawPhone,
        duties: draft.duties,
        roles: Array.from(new Set(draft.duties.map((duty) => duty.role))),
        message: buildReminderMessage({
          name: draft.name,
          dateLabel,
          mosqueName,
          duties: draft.duties,
        }),
      });
      continue;
    }

    const existing = merged.get(normalized);
    if (existing) {
      for (const duty of draft.duties) {
        if (!existing.duties.some((item) => item.label === duty.label)) {
          existing.duties.push(duty);
        }
      }
      if (!existing.names.includes(draft.name)) existing.names.push(draft.name);
      continue;
    }

    merged.set(normalized, {
      names: [draft.name],
      phone: normalized,
      rawPhone: draft.rawPhone,
      duties: [...draft.duties],
    });
  }

  const withPhone: ReminderRecipient[] = Array.from(merged.values()).map((entry) => {
    const name = entry.names.join(" & ");
    return {
      dedupeKey: `${dateYmd}:wa:${entry.phone}`,
      name,
      phone: entry.phone,
      rawPhone: entry.rawPhone,
      duties: entry.duties,
      roles: Array.from(new Set(entry.duties.map((duty) => duty.role))),
      message: buildReminderMessage({
        name,
        dateLabel,
        mosqueName,
        duties: entry.duties,
      }),
    };
  });

  return [...withPhone, ...withoutPhone].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export function buildReminderMessage({
  name,
  dateLabel,
  mosqueName,
  duties,
}: {
  name: string;
  dateLabel: string;
  mosqueName: string;
  duties: ReminderDuty[];
}): string {
  const lines = [
    "🕌 *PENGINGAT TUGAS BESOK*",
    `_${mosqueName}_`,
    "",
    "السلام عليكم ورحمة الله وبركاته",
    `*${name}*`,
    "",
    "Anda dijadwalkan bertugas besok:",
    "",
    `📅 *${dateLabel}*`,
    ...duties.map((duty) => `• *${duty.label}*`),
    "",
    "Mohon hadir 15 menit sebelum adzan. Jika berhalangan, mohon konfirmasi ke Pengurus DKM.",
    "",
    "جزاكم الله خيرا",
  ];

  return lines.join("\n");
}

/** Ringkasan tugas untuk disimpan di kolom log (mis. "Imam Subuh, Muadzin Zuhur"). */
export function summarizeDuties(duties: ReminderDuty[]): string {
  return duties.map((duty) => duty.label).join(", ");
}
