/**
 * Pengirim pengingat WhatsApp memakai WhatsApp Cloud API dari Meta (resmi).
 * Gateway pihak ketiga sengaja tidak didukung lagi karena rentan diblokir.
 *
 * Pesan H-1 bersifat proaktif (di luar jendela layanan 24 jam), jadi Meta
 * mewajibkan pengiriman memakai message template yang sudah disetujui.
 * Template yang dipakai harus memiliki 4 variabel body secara berurutan:
 *   {{1}} nama petugas
 *   {{2}} nama masjid
 *   {{3}} ringkasan tugas (mis. "Imam Subuh, Muadzin Zuhur")
 *   {{4}} tanggal tugas
 */

export type WhatsAppProvider = "cloud";

export interface WhatsAppConfig {
  provider: WhatsAppProvider;
  configured: boolean;
  missing: string[];
  hint: string;
  phoneNumberId: string | null;
  templateName: string | null;
  templateLanguage: string;
  apiVersion: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  provider: WhatsAppProvider;
  reference?: string;
  error?: string;
}

export interface WhatsAppTemplateMessage {
  target: string;
  name: string;
  mosqueName: string;
  duties: string;
  dateLabel: string;
}

const PROVIDER_LABEL = "WhatsApp Cloud API (Meta)";
const DEFAULT_API_VERSION = "v26.0";
const DEFAULT_TEMPLATE_LANGUAGE = "id_ID";
const MAX_PARAMETER_LENGTH = 1024;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function normalizeApiVersion(value: string): string {
  return /^v\d+\.\d+$/.test(value) ? value : DEFAULT_API_VERSION;
}

function normalizeTemplateLanguage(value: string): string {
  return value || DEFAULT_TEMPLATE_LANGUAGE;
}

/** Status konfigurasi WhatsApp Cloud API. Tidak mengandung token/rahasia. */
export function getWhatsAppConfig(): WhatsAppConfig {
  const phoneNumberId = env("WHATSAPP_CLOUD_PHONE_NUMBER_ID");
  const accessToken = env("WHATSAPP_CLOUD_ACCESS_TOKEN");
  const templateName = env("WHATSAPP_CLOUD_TEMPLATE_NAME");
  const templateLanguage = normalizeTemplateLanguage(
    env("WHATSAPP_CLOUD_TEMPLATE_LANGUAGE")
  );
  const apiVersion = normalizeApiVersion(env("WHATSAPP_CLOUD_API_VERSION"));

  const missing: string[] = [];
  if (!phoneNumberId) missing.push("WHATSAPP_CLOUD_PHONE_NUMBER_ID");
  if (!accessToken) missing.push("WHATSAPP_CLOUD_ACCESS_TOKEN");
  if (!templateName) missing.push("WHATSAPP_CLOUD_TEMPLATE_NAME");

  return {
    provider: "cloud",
    configured: missing.length === 0,
    missing,
    hint: missing.length
      ? `Lengkapi ${missing.join(", ")} di environment variable untuk mengaktifkan ${PROVIDER_LABEL}.`
      : `${PROVIDER_LABEL} siap digunakan dengan template "${templateName}" (${templateLanguage}).`,
    phoneNumberId: phoneNumberId || null,
    templateName: templateName || null,
    templateLanguage,
    apiVersion,
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function responseError(payload: unknown): string | null {
  if (typeof payload === "string") return payload.slice(0, 500);
  const data = asRecord(payload);
  if (!data) return null;

  const graphError = asRecord(data.error);
  if (graphError) {
    const title =
      typeof graphError.message === "string"
        ? graphError.message
        : "Gagal mengirim pesan WhatsApp";
    const code = graphError.code ? ` [${String(graphError.code)}]` : "";
    const subcode = graphError.error_subcode
      ? ` (subcode ${String(graphError.error_subcode)})`
      : "";
    return `${title}${code}${subcode}`;
  }

  if (data.status === false || data.success === false || data.error === true) {
    const reason =
      data.reason ?? data.message ?? data.error_message ?? data.error ?? "Gagal mengirim pesan";
    return typeof reason === "string" ? reason : JSON.stringify(reason);
  }
  return null;
}

function responseReference(payload: unknown): string | undefined {
  const data = asRecord(payload);
  if (!data) return undefined;

  const ids: string[] = [];
  const messages = Array.isArray(data.messages) ? data.messages : [];
  for (const item of messages) {
    const id = asRecord(item)?.id;
    if (id !== undefined && id !== null) ids.push(String(id));
  }
  if (!ids.length) {
    const raw = data.id ?? data.messageId ?? asRecord(data.data)?.id ?? asRecord(data.result)?.id;
    const list = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
    ids.push(...list.map(String));
  }
  return ids.length ? ids.join(",") : undefined;
}

function templateText(value: string): string {
  const clean = value.trim() || "-";
  return clean.length > MAX_PARAMETER_LENGTH
    ? `${clean.slice(0, MAX_PARAMETER_LENGTH - 1)}…`
    : clean;
}

async function postJson(url: string, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text.slice(0, 500);
    }

    if (!response.ok) {
      const detail = responseError(payload);
      throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendWhatsAppMessage({
  target,
  name,
  mosqueName,
  duties,
  dateLabel,
}: WhatsAppTemplateMessage): Promise<WhatsAppSendResult> {
  const config = getWhatsAppConfig();
  if (!config.configured) {
    return { ok: false, provider: "cloud", error: config.hint };
  }

  const phone = normalizeWhatsAppNumber(target);
  if (!phone) {
    return { ok: false, provider: "cloud", error: `Nomor WhatsApp tidak valid: ${target}` };
  }

  const accessToken = env("WHATSAPP_CLOUD_ACCESS_TOKEN");
  const url = `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(
    config.phoneNumberId!
  )}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components: [
        {
          type: "body",
          parameters: [name, mosqueName, duties, dateLabel].map((text) => ({
            type: "text",
            text: templateText(text),
          })),
        },
      ],
    },
  };

  try {
    const response = await postJson(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const error = responseError(response);
    if (error) return { ok: false, provider: "cloud", error };
    return {
      ok: true,
      provider: "cloud",
      reference: responseReference(response) ?? `template:${config.templateName}`,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "cloud",
      error: error instanceof Error ? error.message : "Gagal menghubungi WhatsApp Cloud API",
    };
  }
}
