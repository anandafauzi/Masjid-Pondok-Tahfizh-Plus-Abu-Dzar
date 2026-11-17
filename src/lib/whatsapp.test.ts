import { describe, expect, it } from "vitest";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

describe("normalizeWhatsAppNumber", () => {
  it("mengubah nomor Indonesia menjadi format 62", () => {
    expect(normalizeWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsAppNumber("6208123456789")).toBe("628123456789");
  });

  it("menolak nomor kosong atau tidak masuk akal", () => {
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber(null)).toBeNull();
    expect(normalizeWhatsAppNumber("12345")).toBeNull();
    expect(normalizeWhatsAppNumber("abcdef")).toBeNull();
  });
});
