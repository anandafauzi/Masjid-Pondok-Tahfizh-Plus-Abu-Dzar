import { prisma } from "@/lib/prisma";
import { getPublicDataVersion } from "@/lib/public-cache";

/**
 * Info donasi dipakai web publik dan aplikasi Android melalui endpoint
 * terpisah. TvData sengaja tidak menyimpan field donasi sama sekali.
 */

export const MAX_DONATION_ACCOUNTS = 10;
export const MAX_DONATION_TITLE_LENGTH = 120;
export const MAX_DONATION_NOTES_LENGTH = 1_000;
export const MAX_DONATION_FIELD_LENGTH = 120;
export const MAX_QR_DATA_URL_LENGTH = 4_000_000;

const ALLOWED_QR_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export interface DonationAccountData {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  displayOrder: number;
}

export interface DonationInfo {
  title: string;
  notes: string | null;
  qrImageUrl: string | null;
  isActive: boolean;
  accounts: DonationAccountData[];
}

export interface DonationAdminInfo extends DonationInfo {
  id: string;
}

export interface DonationAccountInput {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface DonationInput {
  title: string;
  notes: string | null;
  qrImageUrl: string | null;
  isActive: boolean;
  accounts: DonationAccountInput[];
}

export const DEFAULT_DONATION_INFO: DonationInfo = {
  title: "Donasi Masjid",
  notes: null,
  qrImageUrl: null,
  isActive: false,
  accounts: [],
};

/** QR boleh data URL hasil upload atau tautan HTTPS. HTTP diblokir karena aplikasi Android melarang cleartext. */
export function isValidQrImageUrl(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string") return false;
  if (/^https:\/\//i.test(value)) return value.length <= 2_000;
  if (value.length > MAX_QR_DATA_URL_LENGTH) return false;
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(value);
  return Boolean(match && ALLOWED_QR_MIME.has(match[1].toLowerCase()));
}

function normalizedString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function normalizeAccounts(value: unknown): DonationAccountInput[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_DONATION_ACCOUNTS) return null;

  const accounts: DonationAccountInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    const account: DonationAccountInput = {
      bankName: normalizedString(row.bankName, MAX_DONATION_FIELD_LENGTH),
      accountNumber: normalizedString(row.accountNumber, MAX_DONATION_FIELD_LENGTH),
      accountName: normalizedString(row.accountName, MAX_DONATION_FIELD_LENGTH),
    };
    if (!account.bankName || !account.accountNumber || !account.accountName) {
      return null;
    }
    accounts.push(account);
  }
  return accounts;
}

/** Validasi payload admin sebelum ditulis ke database. */
export function normalizeDonationInput(
  body: unknown
): { ok: true; value: DonationInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Format data tidak valid" };
  }
  const raw = body as Record<string, unknown>;

  const title =
    raw.title === undefined
      ? DEFAULT_DONATION_INFO.title
      : normalizedString(raw.title, MAX_DONATION_TITLE_LENGTH + 1);
  if (!title) return { ok: false, error: "Judul donasi wajib diisi" };
  if (title.length > MAX_DONATION_TITLE_LENGTH) {
    return { ok: false, error: "Judul donasi terlalu panjang" };
  }

  let notes: string | null = null;
  if (raw.notes !== undefined && raw.notes !== null) {
    if (typeof raw.notes !== "string") {
      return { ok: false, error: "Catatan donasi tidak valid" };
    }
    notes = raw.notes.trim().slice(0, MAX_DONATION_NOTES_LENGTH + 1) || null;
    if (notes && notes.length > MAX_DONATION_NOTES_LENGTH) {
      return { ok: false, error: "Catatan donasi terlalu panjang" };
    }
  }

  let qrImageUrl: string | null = null;
  if (raw.qrImageUrl !== undefined && raw.qrImageUrl !== null && raw.qrImageUrl !== "") {
    if (!isValidQrImageUrl(raw.qrImageUrl)) {
      return {
        ok: false,
        error: "QR tidak didukung. Gunakan PNG, JPEG, WebP, GIF, atau tautan HTTPS",
      };
    }
    qrImageUrl = String(raw.qrImageUrl);
  }

  if (raw.isActive !== undefined && typeof raw.isActive !== "boolean") {
    return { ok: false, error: "Status donasi tidak valid" };
  }

  const accounts = normalizeAccounts(raw.accounts);
  if (!accounts) {
    return {
      ok: false,
      error: `Maksimal ${MAX_DONATION_ACCOUNTS} rekening dan setiap rekening wajib lengkap`,
    };
  }

  return {
    ok: true,
    value: {
      title,
      notes,
      qrImageUrl,
      isActive: raw.isActive === true,
      accounts,
    },
  };
}

type SettingRow = {
  title: string;
  notes: string | null;
  qrImageUrl: string | null;
  isActive: boolean;
};

type AccountRow = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  displayOrder: number;
};

function toInfo(
  setting: SettingRow,
  accounts: AccountRow[],
  admin = false
): DonationInfo {
  if (!setting.isActive && !admin) {
    return { ...DEFAULT_DONATION_INFO, isActive: false };
  }

  return {
    title: setting.title.trim() || DEFAULT_DONATION_INFO.title,
    notes: setting.notes?.trim() || null,
    qrImageUrl: isValidQrImageUrl(setting.qrImageUrl) ? setting.qrImageUrl : null,
    isActive: setting.isActive,
    accounts: accounts
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((row) => ({
        id: row.id,
        bankName: row.bankName.trim().slice(0, MAX_DONATION_FIELD_LENGTH),
        accountNumber: row.accountNumber.trim().slice(0, MAX_DONATION_FIELD_LENGTH),
        accountName: row.accountName.trim().slice(0, MAX_DONATION_FIELD_LENGTH),
        displayOrder: row.displayOrder,
      }))
      .filter(
        (row) => row.bankName && row.accountNumber && row.accountName
      )
      .slice(0, MAX_DONATION_ACCOUNTS),
  };
}

export async function getAdminDonationInfo(): Promise<DonationAdminInfo> {
  const setting = await prisma.donationSetting.findFirst({
    orderBy: { id: "asc" },
    include: {
      accounts: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] },
    },
  });

  if (!setting) return { id: "default", ...DEFAULT_DONATION_INFO };

  // Admin tetap perlu melihat data yang sedang nonaktif untuk disunting.
  return { id: setting.id, ...toInfo(setting, setting.accounts, true) };
}

const DONATION_TTL_MS = 30_000;
let cachedDonation: {
  at: number;
  version: number;
  value: DonationInfo;
} | null = null;

/** Versi publik dipakai web; Android mengambil endpoint yang sama saat refresh. */
export async function getPublicDonationInfo(): Promise<DonationInfo> {
  const version = getPublicDataVersion();
  if (
    cachedDonation &&
    cachedDonation.version === version &&
    Date.now() - cachedDonation.at < DONATION_TTL_MS
  ) {
    return cachedDonation.value;
  }

  try {
    const setting = await prisma.donationSetting.findFirst({
      orderBy: { id: "asc" },
      include: { accounts: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] } },
    });
    const value = setting
      ? toInfo(setting, setting.accounts)
      : DEFAULT_DONATION_INFO;
    cachedDonation = { at: Date.now(), version, value };
    return value;
  } catch {
    return cachedDonation?.value ?? DEFAULT_DONATION_INFO;
  }
}
