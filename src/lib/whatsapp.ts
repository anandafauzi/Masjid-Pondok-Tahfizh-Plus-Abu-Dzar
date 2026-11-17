/**
 * Pengirim WhatsApp via gateway pihak ketiga.
 *
 * Secara default memakai Fonnte (paket Free: 1.000 pesan teks/bulan), tetapi
 * bisa diganti ke Wablas atau webhook generik lewat environment variable.
 * Tidak ada kredensial yang disimpan di source code.
 */

export type WhatsAppProvider = "fonnte" | "wablas" | "webhook";

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  configured: boolean;
  missing: string[];
  hint: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  provider: WhatsAppProvider;
  reference?: string;
  error?: string;
}

const PROVIDER_LABELS: Record<WhatsAppProvider, string> = {
  fonnte: "Fonnte",
  wablas: "Wablas",
  webhook: "Webhook generik",
};

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Tentukan gateway aktif. Token eksplisit lebih diutamakan saat auto-detect. */
export function getWhatsAppConfig(): WhatsAppConfig {
  const requested = env("WHATSAPP_PROVIDER").toLowerCase();
  let provider: WhatsAppProvider =
    requested === "fonnte" || requested === "wablas" || requested === "webhook"
      ? requested
      : "fonnte";

  if (!requested) {
    if (env("FONNTE_TOKEN")) provider = "fonnte";
    else if (env("WABLAS_TOKEN") && env("WABLAS_DOMAIN")) provider = "wablas";
    else if (env("WHATSAPP_WEBHOOK_URL")) provider = "webhook";
  }

  const missing: string[] = [];
  if (provider === "fonnte" && !env("FONNTE_TOKEN")) missing.push("FONNTE_TOKEN");
  if (provider === "wablas") {
    if (!env("WABLAS_TOKEN")) missing.push("WABLAS_TOKEN");
    if (!env("WABLAS_DOMAIN")) missing.push("WABLAS_DOMAIN");
  }
  if (provider === "webhook" && !env("WHATSAPP_WEBHOOK_URL")) {
    missing.push("WHATSAPP_WEBHOOK_URL");
  }

  return {
    provider,
    configured: missing.length === 0,
    missing,
    hint: missing.length
      ? `Lengkapi ${missing.join(", ")} di environment variable untuk mengaktifkan ${PROVIDER_LABELS[provider]}.`
      : `${PROVIDER_LABELS[provider]} siap digunakan.`,
  };
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppConfig().configured;
}

/**
 * Ubah berbagai format nomor Indonesia menjadi format internasional tanpa "+".
 * Contoh: "0812-3456-7890" -> "6281234567890".
 */
export function normalizeWhatsAppNumber(value: string | null | undefined): string | null {
  if (!value) return null;

  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("620")) digits = `62${digits.slice(3)}`;
  else if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;

  if (!/^62\d{7,13}$/.test(digits)) return null;
  return digits;
}

function responseError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (data.status === false || data.success === false || data.error === true) {
    const reason =
      data.reason ?? data.message ?? data.error_message ?? data.error ?? "Gagal mengirim pesan";
    return typeof reason === "string" ? reason : JSON.stringify(reason);
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function responseReference(payload: unknown): string | undefined {
  const data = asRecord(payload);
  if (!data) return undefined;
  const raw =
    data.id ??
    data.messageId ??
    asRecord(data.data)?.id ??
    asRecord(data.result)?.id;
  const list = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  return list.length ? list.map(String).join(",") : undefined;
}

async function postJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text.slice(0, 500);
  }

  if (!response.ok) {
    const detail = responseError(payload) ?? (typeof payload === "string" ? payload : "");
    throw new Error(
      `HTTP ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }
  return payload;
}

export async function sendWhatsAppMessage({
  target,
  message,
}: {
  target: string;
  message: string;
}): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  if (!config.configured) {
    return { ok: false, provider: config.provider, error: config.hint };
  }

  const phone = normalizeWhatsAppNumber(target);
  if (!phone) {
    return { ok: false, provider: config.provider, error: `Nomor WhatsApp tidak valid: ${target}` };
  }

  try {
    if (config.provider === "fonnte") {
      const payload = await postJson("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: env("FONNTE_TOKEN"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: phone, message, countryCode: "62" }),
      });
      const error = responseError(payload);
      if (error) return { ok: false, provider: config.provider, error };
      return { ok: true, provider: config.provider, reference: responseReference(payload) };
    }

    if (config.provider === "wablas") {
      const domain = env("WABLAS_DOMAIN").replace(/\/+$/, "");
      const payload = await postJson(`${domain}/api/send-message`, {
        method: "POST",
        headers: {
          Authorization: env("WABLAS_TOKEN"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ phone, message }).toString(),
      });
      const error = responseError(payload);
      if (error) return { ok: false, provider: config.provider, error };
      return { ok: true, provider: config.provider, reference: responseReference(payload) };
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const webhookToken = env("WHATSAPP_WEBHOOK_TOKEN");
    if (webhookToken) headers.Authorization = `Bearer ${webhookToken}`;
    const payload = await postJson(env("WHATSAPP_WEBHOOK_URL"), {
      method: "POST",
      headers,
      body: JSON.stringify({ target: phone, message, type: "H1_REMINDER" }),
    });
    const error = responseError(payload);
    if (error) return { ok: false, provider: config.provider, error };
    return { ok: true, provider: config.provider, reference: responseReference(payload) };
  } catch (error) {
    return {
      ok: false,
      provider: config.provider,
      error: error instanceof Error ? error.message : "Gagal menghubungi gateway WhatsApp",
    };
  }
}
