import { describe, expect, it } from "vitest";
import {
  DEFAULT_DONATION_INFO,
  isValidQrImageUrl,
  normalizeDonationInput,
} from "@/lib/donation";

describe("info donasi", () => {
  it("memakai judul default dan menolak judul kosong", () => {
    const empty = normalizeDonationInput({});
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.value.title).toBe(DEFAULT_DONATION_INFO.title);

    const blank = normalizeDonationInput({ title: "   " });
    expect(blank.ok).toBe(false);
  });

  it("membersihkan teks dan mengurutkan rekening sesuai input", () => {
    const parsed = normalizeDonationInput({
      title: "  Donasi Masjid  ",
      notes: "  Transfer atau QRIS  ",
      isActive: true,
      accounts: [
        {
          bankName: " BSI ",
          accountNumber: " 123 456 ",
          accountName: " Masjid Abu Dzar ",
        },
      ],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual({
      title: "Donasi Masjid",
      notes: "Transfer atau QRIS",
      qrImageUrl: null,
      isActive: true,
      accounts: [
        {
          bankName: "BSI",
          accountNumber: "123 456",
          accountName: "Masjid Abu Dzar",
        },
      ],
    });
  });

  it("menolak rekening yang tidak lengkap", () => {
    const parsed = normalizeDonationInput({
      accounts: [{ bankName: "BSI", accountNumber: "", accountName: "Masjid" }],
    });
    expect(parsed.ok).toBe(false);
  });

  it("hanya menerima QR data URL raster atau tautan HTTPS", () => {
    expect(isValidQrImageUrl(null)).toBe(true);
    expect(isValidQrImageUrl("https://example.com/qris.png")).toBe(true);
    expect(isValidQrImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isValidQrImageUrl("http://example.com/qris.png")).toBe(false);
    expect(isValidQrImageUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isValidQrImageUrl("bukan-url")).toBe(false);
  });
});
