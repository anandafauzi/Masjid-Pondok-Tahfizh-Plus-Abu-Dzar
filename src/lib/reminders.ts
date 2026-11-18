import type { PetugasItem } from "@/types/petugas";
import type { ReminderSettings } from "@/lib/reminder-settings";
import { normalizeEmail } from "@/lib/email";

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
  email: string | null;
  rawEmail: string | null;
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
 * pada peran apa pun (mis. merangkap imam & khatib).
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

/** Template khatib dipakai bila ada tugas khatib; jika tidak, template imam. */
function templateForDuties(duties: ReminderDuty[], settings: ReminderSettings): string {
  return duties.some((duty) => duty.role === "KHATIB")
    ? settings.khatibTemplate
    : settings.imamTemplate;
}

/** Isi variabel template tanpa memakai regex agar aman untuk teks bebas. */
export function renderReminderMessage({
  template,
  name,
  dateLabel,
  mosqueName,
  duties,
}: {
  template: string;
  name: string;
  dateLabel: string;
  mosqueName: string;
  duties: ReminderDuty[];
}): string {
  const ringkas = duties.map((duty) => duty.label).join(", ");
  const daftar = duties.map((duty) => `- ${duty.label}`).join("\n");
  const values: Record<string, string> = {
    "{nama}": name,
    "{masjid}": mosqueName,
    "{tanggal}": dateLabel,
    "{tugas}": ringkas,
    "{daftar_tugas}": daftar,
  };

  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.split(key).join(value);
  }
  return result;
}

export function buildReminderRecipients({
  dateYmd,
  dateLabel,
  mosqueName,
  assignments,
  petugas,
  settings,
}: {
  dateYmd: string;
  dateLabel: string;
  mosqueName: string;
  assignments: DutyAssignment[];
  petugas: PetugasItem[];
  settings: ReminderSettings;
}): ReminderRecipient[] {
  interface Draft {
    key: string;
    name: string;
    rawEmail: string | null;
    duties: ReminderDuty[];
  }

  const drafts = new Map<string, Draft>();

  for (const assignment of assignments) {
    // Muadzin sengaja tidak termasuk dalam pengingat email.
    if (assignment.role === "MUADZIN") continue;
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
      rawEmail: match?.email?.trim() || null,
      duties: [duty],
    });
  }

  // Gabungkan orang berbeda yang memakai email yang sama agar tidak menerima
  // dua pesan terpisah untuk tanggal yang sama.
  const merged = new Map<
    string,
    { names: string[]; email: string; rawEmail: string | null; duties: ReminderDuty[] }
  >();
  const withoutEmail: ReminderRecipient[] = [];

  for (const draft of drafts.values()) {
    const normalized = normalizeEmail(draft.rawEmail);
    if (!normalized) {
      withoutEmail.push({
        dedupeKey: `${dateYmd}:noemail:${draft.key}`,
        name: draft.name,
        email: null,
        rawEmail: draft.rawEmail,
        duties: draft.duties,
        roles: Array.from(new Set(draft.duties.map((duty) => duty.role))),
        message: renderReminderMessage({
          template: templateForDuties(draft.duties, settings),
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
      email: normalized,
      rawEmail: draft.rawEmail,
      duties: [...draft.duties],
    });
  }

  const withEmail: ReminderRecipient[] = Array.from(merged.values()).map((entry) => {
    const name = entry.names.join(" & ");
    return {
      dedupeKey: `${dateYmd}:email:${entry.email}`,
      name,
      email: entry.email,
      rawEmail: entry.rawEmail,
      duties: entry.duties,
      roles: Array.from(new Set(entry.duties.map((duty) => duty.role))),
      message: renderReminderMessage({
        template: templateForDuties(entry.duties, settings),
        name,
        dateLabel,
        mosqueName,
        duties: entry.duties,
      }),
    };
  });

  return [...withEmail, ...withoutEmail].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

/** Ringkasan tugas untuk disimpan di kolom log (mis. "Imam Subuh, Imam Zuhur"). */
export function summarizeDuties(duties: ReminderDuty[]): string {
  return duties.map((duty) => duty.label).join(", ");
}
