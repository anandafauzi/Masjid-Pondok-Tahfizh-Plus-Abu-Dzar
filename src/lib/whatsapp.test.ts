import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWhatsAppConfig,
  normalizeWhatsAppNumber,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";

const ENV_KEYS = [
  "WHATSAPP_CLOUD_PHONE_NUMBER_ID",
  "WHATSAPP_CLOUD_ACCESS_TOKEN",
  "WHATSAPP_CLOUD_TEMPLATE_NAME",
  "WHATSAPP_CLOUD_TEMPLATE_LANGUAGE",
  "WHATSAPP_CLOUD_API_VERSION",
];

function setCloudEnv() {
  vi.stubEnv("WHATSAPP_CLOUD_PHONE_NUMBER_ID", "123456789");
  vi.stubEnv("WHATSAPP_CLOUD_ACCESS_TOKEN", "token-permanen");
  vi.stubEnv("WHATSAPP_CLOUD_TEMPLATE_NAME", "pengingat_h1");
  vi.stubEnv("WHATSAPP_CLOUD_TEMPLATE_LANGUAGE", "id_ID");
  vi.stubEnv("WHATSAPP_CLOUD_API_VERSION", "v26.0");
}

beforeEach(() => {
  for (const key of ENV_KEYS) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

describe("getWhatsAppConfig", () => {
  it("hanya mengenali WhatsApp Cloud API dan memakai nilai default yang aman", () => {
    setCloudEnv();

    const config = getWhatsAppConfig();
    expect(config.provider).toBe("cloud");
    expect(config.configured).toBe(true);
    expect(config.missing).toEqual([]);
    expect(config.templateLanguage).toBe("id_ID");
    expect(config.apiVersion).toBe("v26.0");
    expect(config.hint).toContain("WhatsApp Cloud API (Meta)");
  });

  it("menandai kredensial wajib yang belum diisi", () => {
    vi.stubEnv("WHATSAPP_CLOUD_PHONE_NUMBER_ID", "123456789");

    const config = getWhatsAppConfig();
    expect(config.configured).toBe(false);
    expect(config.missing).toEqual([
      "WHATSAPP_CLOUD_ACCESS_TOKEN",
      "WHATSAPP_CLOUD_TEMPLATE_NAME",
    ]);
  });
});

describe("sendWhatsAppMessage", () => {
  it("mengirim message template resmi ke endpoint Graph API", async () => {
    setCloudEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messages: [{ id: "wamid.abc123" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWhatsAppMessage({
      target: "0812-3456-7890",
      name: "Ust. Ahmad Fauzi",
      mosqueName: "Masjid Abu Dzar",
      duties: "Imam Subuh, Muadzin Zuhur",
      dateLabel: "Jumat, 20 November 2026",
    });

    expect(result).toEqual({
      ok: true,
      provider: "cloud",
      reference: "wamid.abc123",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v26.0/123456789/messages");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-permanen"
    );

    const body = JSON.parse(init.body as string) as {
      messaging_product: string;
      to: string;
      type: string;
      template: {
        name: string;
        language: { code: string };
        components: Array<{ type: string; parameters: Array<{ type: string; text: string }> }>;
      };
    };
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("6281234567890");
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("pengingat_h1");
    expect(body.template.language.code).toBe("id_ID");
    expect(body.template.components[0].parameters.map((item) => item.text)).toEqual([
      "Ust. Ahmad Fauzi",
      "Masjid Abu Dzar",
      "Imam Subuh, Muadzin Zuhur",
      "Jumat, 20 November 2026",
    ]);
  });

  it("mengembalikan pesan error Graph API dengan jelas", async () => {
    setCloudEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: { message: "Template not approved", code: 132000 },
          }),
      })
    );

    const result = await sendWhatsAppMessage({
      target: "0812-3456-7890",
      name: "Ust. Ahmad",
      mosqueName: "Masjid Abu Dzar",
      duties: "Imam Subuh",
      dateLabel: "Jumat, 20 November 2026",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Template not approved");
    expect(result.error).toContain("[132000]");
  });

  it("tidak menghubungi Meta bila konfigurasi belum lengkap", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWhatsAppMessage({
      target: "0812-3456-7890",
      name: "Ust. Ahmad",
      mosqueName: "Masjid Abu Dzar",
      duties: "Imam Subuh",
      dateLabel: "Jumat, 20 November 2026",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("WHATSAPP_CLOUD_PHONE_NUMBER_ID");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
