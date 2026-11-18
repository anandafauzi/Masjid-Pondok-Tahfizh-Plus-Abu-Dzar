import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEmailConfig, normalizeEmail, sendReminderEmail } from "@/lib/email";

const ENV_KEYS = ["RESEND_API_KEY", "EMAIL_FROM"];

function setEmailEnv() {
  vi.stubEnv("RESEND_API_KEY", "re_test_token");
  vi.stubEnv("EMAIL_FROM", "Pengingat@AbuDzar.sch.id");
}

beforeEach(() => {
  for (const key of ENV_KEYS) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeEmail", () => {
  it("membersihkan dan menurunkan alamat email", () => {
    expect(normalizeEmail("  Ustadz@AbuDzar.Sch.ID  ")).toBe("ustadz@abudzar.sch.id");
  });

  it("menolak alamat kosong atau tidak valid", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail("bukan-email")).toBeNull();
    expect(normalizeEmail("nama@domain")).toBeNull();
  });
});

describe("getEmailConfig", () => {
  it("mengenali konfigurasi Resend yang lengkap", () => {
    setEmailEnv();

    const config = getEmailConfig();
    expect(config.provider).toBe("email");
    expect(config.configured).toBe(true);
    expect(config.missing).toEqual([]);
    expect(config.from).toBe("pengingat@abudzar.sch.id");
    expect(config.hint).toContain("Resend");
  });

  it("menandai variabel wajib yang belum diisi", () => {
    const config = getEmailConfig();
    expect(config.configured).toBe(false);
    expect(config.missing).toEqual(["RESEND_API_KEY", "EMAIL_FROM"]);
    expect(config.hint).toContain("RESEND_API_KEY");
  });
});

describe("sendReminderEmail", () => {
  it("mengirim email lewat endpoint Resend", async () => {
    setEmailEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: "email-abc123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendReminderEmail({
      to: " ustadz@abudzar.sch.id ",
      name: "Ust. Ahmad Fauzi",
      mosqueName: "Masjid Abu Dzar",
      duties: "Imam Subuh, Muadzin Zuhur",
      dateLabel: "Jumat, 20 November 2026",
      text: "Pengingat tugas besok",
    });

    expect(result).toEqual({ ok: true, provider: "email", reference: "email-abc123" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_token");

    const body = JSON.parse(init.body as string) as {
      from: string;
      to: string[];
      subject: string;
      text: string;
      html: string;
    };
    expect(body.from).toBe("pengingat@abudzar.sch.id");
    expect(body.to).toEqual(["ustadz@abudzar.sch.id"]);
    expect(body.subject).toContain("Masjid Abu Dzar");
    expect(body.text).toBe("Pengingat tugas besok");
    expect(body.html).toContain("Ust. Ahmad Fauzi");
    expect(body.html).toContain("Imam Subuh");
    expect(body.html).toContain("Muadzin Zuhur");
  });

  it("mengembalikan pesan error Resend dengan jelas", async () => {
    setEmailEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () =>
          JSON.stringify({
            name: "rate_limit_exceeded",
            message: "Rate limit exceeded",
          }),
      })
    );

    const result = await sendReminderEmail({
      to: "ustadz@abudzar.sch.id",
      name: "Ust. Ahmad",
      mosqueName: "Masjid Abu Dzar",
      duties: "Imam Subuh",
      dateLabel: "Jumat, 20 November 2026",
      text: "Pengingat tugas besok",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Rate limit exceeded");
    expect(result.error).toContain("[rate_limit_exceeded]");
  });

  it("tidak menghubungi Resend bila konfigurasi belum lengkap", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendReminderEmail({
      to: "ustadz@abudzar.sch.id",
      name: "Ust. Ahmad",
      mosqueName: "Masjid Abu Dzar",
      duties: "Imam Subuh",
      dateLabel: "Jumat, 20 November 2026",
      text: "Pengingat tugas besok",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("RESEND_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
