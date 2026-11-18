/**
 * Pengirim pengingat H-1 lewat Resend (API resmi, gratis 3.000 email/bulan).
 *
 * Memakai API resmi Resend, bukan gateway pihak ketiga. Kredensial dibaca dari
 * environment variable; tidak ada rahasia di source code.
 *
 * Untuk deliverability yang baik, domain di EMAIL_FROM wajib diverifikasi di
 * Resend dan memiliki record SPF, DKIM, dan DMARC.
 */

export type EmailProvider = "email";

export interface EmailConfig {
  provider: EmailProvider;
  configured: boolean;
  missing: string[];
  hint: string;
  from: string | null;
}

export interface EmailSendResult {
  ok: boolean;
  provider: EmailProvider;
  reference?: string;
  error?: string;
}

export interface ReminderEmailMessage {
  to: string;
  name: string;
  mosqueName: string;
  duties: string;
  dateLabel: string;
  text: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_TEXT_LENGTH = 20_000;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Validasi alamat email sederhana yang cukup untuk data petugas. */
export function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** Status konfigurasi pengirim email. Tidak mengandung API key. */
export function getEmailConfig(): EmailConfig {
  const apiKey = env("RESEND_API_KEY");
  const from = normalizeEmail(env("EMAIL_FROM"));
  const missing: string[] = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!from) missing.push("EMAIL_FROM");

  return {
    provider: "email",
    configured: missing.length === 0,
    missing,
    hint: missing.length
      ? `Lengkapi ${missing.join(", ")} di environment variable untuk mengaktifkan pengirim email.`
      : `Email siap dikirim dari ${from} lewat Resend. Pastikan domain sudah diverifikasi (SPF/DKIM/DMARC).`,
    from,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml({ name, mosqueName, duties, dateLabel, text }: ReminderEmailMessage): string {
  const dutyItems = duties
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<li style="margin:6px 0;">${escapeHtml(item)}</li>`)
    .join("");

  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#19261f;">
  <p>Assalamu'alaikum <strong>${escapeHtml(name)}</strong>,</p>
  <p>Ini pengingat dari <strong>${escapeHtml(mosqueName)}</strong> bahwa Anda bertugas pada <strong>${escapeHtml(dateLabel)}</strong>:</p>
  <ul style="margin:8px 0 16px;padding-left:22px;">${dutyItems}</ul>
  <p>Mohon hadir 15 menit sebelum adzan. Jika berhalangan, mohon konfirmasi ke Pengurus DKM.</p>
  <p>Jazakumullahu khairan.</p>
  <hr style="border:0;border-top:1px solid #ded5c4;margin:20px 0;" />
  <pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;color:#5a685e;">${escapeHtml(text)}</pre>
</div>`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function responseError(payload: unknown): string | null {
  if (typeof payload === "string") return payload.slice(0, 500);
  const data = asRecord(payload);
  if (!data) return null;

  const message = data.message ?? data.error;
  if (typeof message === "string" && message.trim()) {
    const name = typeof data.name === "string" && data.name ? ` [${data.name}]` : "";
    return `${message}${name}`;
  }
  if (data.statusCode !== undefined) return `Resend error ${String(data.statusCode)}`;
  return null;
}

async function postJson(body: unknown, apiKey: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await response.text();
    let payload: unknown = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = raw.slice(0, 500);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${responseError(payload) ? `: ${responseError(payload)}` : ""}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendReminderEmail(message: ReminderEmailMessage): Promise<EmailSendResult> {
  const config = getEmailConfig();
  if (!config.configured) {
    return { ok: false, provider: "email", error: config.hint };
  }

  const to = normalizeEmail(message.to);
  if (!to) {
    return { ok: false, provider: "email", error: `Alamat email tidak valid: ${message.to}` };
  }

  const text = message.text.trim().slice(0, MAX_TEXT_LENGTH);
  const payload = {
    from: config.from,
    to: [to],
    subject: `Pengingat tugas besok - ${message.mosqueName}`,
    text,
    html: buildHtml({ ...message, to, text }),
  };

  try {
    const response = await postJson(payload, env("RESEND_API_KEY"));
    const error = responseError(response);
    if (error) return { ok: false, provider: "email", error };

    const id = asRecord(response)?.id;
    return {
      ok: true,
      provider: "email",
      reference: id === undefined || id === null ? undefined : String(id),
    };
  } catch (error) {
    return {
      ok: false,
      provider: "email",
      error: error instanceof Error ? error.message : "Gagal menghubungi Resend",
    };
  }
}
