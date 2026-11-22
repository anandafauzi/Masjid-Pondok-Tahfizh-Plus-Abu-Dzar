"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  History,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, PageHeader, SectionHeading } from "@/components/ui";
import type { ReminderPlan, ReminderPlanRecipient } from "@/lib/reminder-service";
import {
  REMINDER_TEMPLATE_VARIABLES,
  type ReminderSettings,
} from "@/lib/reminder-settings";
import type { ReminderStatus } from "@prisma/client";

function wibNow(now: Date): { ymd: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** Samakan dengan resolveReminderTargetDate() di server untuk pratinjau. */
function targetYmd(now: Date, settings: ReminderSettings): string {
  const { ymd, time } = wibNow(now);
  // Offset 0 (hari H) tidak boleh mundur ke kemarin saat cron lebih awal.
  const offset = Math.max(0, time >= settings.sendTime ? settings.offsetDays : settings.offsetDays - 1);
  const date = new Date(`${ymd}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function tomorrowYmd() {
  return targetYmd(new Date(), {
    offsetDays: 1,
    sendTime: "16:00",
    imamTemplate: "",
    khatibTemplate: "",
  });
}

function formatWib(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** Render pesan di browser agar edit template langsung terlihat tanpa menyimpan. */
function previewMessage(
  recipient: ReminderPlanRecipient,
  settings: ReminderSettings,
  mosqueName: string,
  dateLabel: string
): string {
  const template = recipient.duties.some((duty) => duty.role === "KHATIB")
    ? settings.khatibTemplate
    : settings.imamTemplate;
  const values: Record<string, string> = {
    "{nama}": recipient.name,
    "{masjid}": mosqueName,
    "{tanggal}": dateLabel,
    "{tugas}": recipient.duties.map((duty) => duty.label).join(", "),
    "{daftar_tugas}": recipient.duties.map((duty) => `- ${duty.label}`).join("\n"),
  };
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.split(key).join(value);
  }
  return result;
}

const STATUS_LABEL: Record<ReminderStatus, string> = {
  PENDING: "Menunggu",
  SENDING: "Sedang dikirim",
  SENT: "Terkirim",
  FAILED: "Gagal",
  SKIPPED: "Dilewati",
};

function StatusBadge({ status }: { status: ReminderStatus | null }) {
  if (!status) return <Badge color="blue">Belum dikirim</Badge>;
  if (status === "SENT") return <Badge color="green">Terkirim</Badge>;
  if (status === "FAILED") return <Badge color="red">Gagal</Badge>;
  if (status === "SENDING" || status === "PENDING") {
    return <Badge color="amber">Sedang dikirim</Badge>;
  }
  return <Badge color="slate">Dilewati</Badge>;
}

function RoleBadges({ roles }: { roles: ReminderPlanRecipient["roles"] }) {
  return (
    <>
      {roles.map((role) => (
        <span
          key={role}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
            role === "IMAM"
              ? "border-[#bde5d2] bg-[#f0f9f4] text-[#1e6149]"
              : "border-[#ecd8a6] bg-[#faf4e6] text-[#7c6630]"
          }`}
        >
          {role === "IMAM" ? "Imam" : "Khatib"}
        </span>
      ))}
    </>
  );
}

export default function AdminPengingatPage() {
  const [date, setDate] = useState(tomorrowYmd);
  const [plan, setPlan] = useState<ReminderPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [form, setForm] = useState<ReminderSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<"imam" | "khatib">("imam");
  const imamRef = useRef<HTMLTextAreaElement>(null);
  const khatibRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async (targetDate = date) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reminders?date=${encodeURIComponent(targetDate)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data pengingat");
      setPlan(data as ReminderPlan);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat data pengingat");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSettingsLoading(true);
      try {
        const res = await fetch("/api/admin/reminder-settings", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat pengaturan pengingat");
        if (cancelled) return;
        const loaded = data as ReminderSettings;
        setSettings(loaded);
        setForm(loaded);
        setDate(targetYmd(new Date(), loaded));
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof Error ? error.message : "Gagal memuat pengaturan pengingat"
          );
        }
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings() {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reminder-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, offsetDays: Number(form.offsetDays) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan pengingat");
      const saved = data as ReminderSettings;
      setSettings(saved);
      setForm(saved);

      const nextDate = targetYmd(new Date(), saved);
      if (nextDate === date) void load();
      else setDate(nextDate);
      toast.success("Jadwal dan template pengingat tersimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan pengaturan pengingat");
    } finally {
      setSaving(false);
    }
  }

  function insertVariable(variable: string) {
    if (!form) return;
    const key = activeTemplate === "imam" ? "imamTemplate" : "khatibTemplate";
    const field = activeTemplate === "imam" ? imamRef.current : khatibRef.current;
    const start = field?.selectionStart ?? form[key].length;
    const end = field?.selectionEnd ?? start;
    const next = form[key].slice(0, start) + variable + form[key].slice(end);
    setForm({ ...form, [key]: next });
    requestAnimationFrame(() => {
      field?.focus();
      const cursor = start + variable.length;
      field?.setSelectionRange(cursor, cursor);
    });
  }

  async function send(dedupeKeys?: string[], force = false) {
    const key = dedupeKeys?.length === 1 ? dedupeKeys[0] : "__all__";
    if (!dedupeKeys?.length) {
      const total = plan?.recipients.filter((r) => r.email && r.status !== "SENT").length ?? 0;
      if (!total) {
        toast.error("Tidak ada penerima yang perlu dikirimi pesan");
        return;
      }
      if (!confirm(`Kirim pengingat email ke ${total} penerima untuk tanggal ${plan?.dateLabel}?`)) {
        return;
      }
    } else if (force) {
      if (!confirm("Kirim ulang pengingat ke penerima ini?")) return;
    }

    setSending(key);
    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, dedupeKeys, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim pengingat");

      if (data.plan) setPlan(data.plan as ReminderPlan);
      const results = (data.results ?? []) as Array<{ status: string }>;
      const sent = results.filter((result) => result.status === "SENT").length;
      const skipped = results.filter((result) => result.status === "SKIPPED").length;
      const failed = results.filter((result) => result.status === "FAILED").length;

      if (sent > 0) toast.success(`${sent} pesan berhasil dikirim`);
      if (skipped > 0) toast(` ${skipped} penerima dilewati`, { icon: "ℹ️" });
      if (failed > 0) toast.error(`${failed} pesan gagal dikirim`);
      if (!sent && !skipped && !failed) toast.error("Tidak ada pesan yang dikirim");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengirim pengingat");
    } finally {
      setSending(null);
    }
  }

  const sendable = plan?.recipients.filter((r) => r.email && r.status !== "SENT") ?? [];
  const emailConfig = plan?.email;
  const isDirty = Boolean(form && settings && JSON.stringify(form) !== JSON.stringify(settings));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BellRing}
        title="Pengingat Email"
        description="Atur jadwal dan isi pengingat otomatis untuk imam dan khatib. Muadzin tetap ada di jadwal & layar TV, tetapi tidak menerima email pengingat."
      />

      {/* Status pengirim email */}
      <Card className={emailConfig?.configured ? "border-[#bde5d2] bg-[#f0f9f4]" : "border-[#ecd8a6] bg-[#faf4e6]"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                emailConfig?.configured ? "bg-[#2d946e] text-white" : "bg-[#c5a059] text-white"
              }`}
            >
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#19261f]">
                {emailConfig?.configured
                  ? "Resend (email) aktif"
                  : "Resend (email) belum aktif"}
              </p>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-[#5a685e]">
                {emailConfig?.hint ??
                  "Status koneksi akan tampil setelah data pengingat dimuat."}{" "}
                Email dikirim langsung tanpa template persetujuan. Pratinjau di bawah
                menampilkan isi email yang akan dikirim.
              </p>
              {emailConfig?.missing?.length ? (
                <p className="mt-1 text-[11px] font-semibold text-[#8a6820]">
                  Belum diisi: {emailConfig.missing.join(", ")}
                </p>
              ) : null}
              {emailConfig?.configured ? (
                <p className="mt-1 text-[11px] font-semibold text-[#1e6149]">
                  Dari: {emailConfig.from}
                </p>
              ) : null}
            </div>
          </div>
          <a
            href="https://resend.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#ecd8a6] bg-white px-3 py-2 text-xs font-bold text-[#8a6820] hover:bg-[#fdf8ec]"
          >
            <span>Panduan Resend</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </Card>

      {/* Jadwal & template */}
      <Card className="border-[#ded5c4] bg-white">
        <SectionHeading
          icon={SlidersHorizontal}
          title="Jadwal & template pengingat"
          description="Perubahan pada kolom langsung terlihat di pratinjau pesan. Simpan agar pengiriman otomatis mengikuti jadwal ini."
        />

        {settingsLoading || !form ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#5a685e]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat pengaturan...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="reminder-offset" className="text-xs font-bold text-[#5a685e]">
                  Kirim pada H- berapa
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="reminder-offset"
                    type="number"
                    min={0}
                    max={30}
                    value={form.offsetDays}
                    onChange={(event) =>
                      setForm({ ...form, offsetDays: Number(event.target.value) })
                    }
                    className="w-24 rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-sm font-semibold text-[#19261f] outline-none focus:border-[#2d946e] focus:ring-2 focus:ring-[#2d946e]/20"
                  />
                  <span className="text-xs text-[#5a685e]">hari sebelum tugas (0 = hari H)</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="reminder-time" className="flex items-center gap-1.5 text-xs font-bold text-[#5a685e]">
                  <Clock3 className="h-3.5 w-3.5 text-[#8a6820]" />
                  Jam kirim (WIB)
                </label>
                <input
                  id="reminder-time"
                  type="time"
                  value={form.sendTime}
                  onChange={(event) => setForm({ ...form, sendTime: event.target.value })}
                  className="w-32 rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-sm font-semibold text-[#19261f] outline-none focus:border-[#2d946e] focus:ring-2 focus:ring-[#2d946e]/20"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-[#bde5d2] bg-[#f0f9f4] p-3 text-xs leading-relaxed text-[#2b594b]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2d946e]" />
              <p>
                Pengiriman tetap otomatis setiap hari. Contoh H-1 jam 08.00: email untuk
                jadwal besok dikirim saat cron berjalan setelah jam 08.00 WIB. Pada Vercel
                Hobby, cron bisa berjalan sampai sekitar satu jam setelah jam tersebut;
                pengiriman dibuat aman diulang sehingga tidak dobel.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="imam-template" className="text-xs font-bold text-[#5a685e]">
                  Template pesan Imam
                </label>
                <textarea
                  id="imam-template"
                  ref={imamRef}
                  rows={9}
                  spellCheck={false}
                  value={form.imamTemplate}
                  onFocus={() => setActiveTemplate("imam")}
                  onChange={(event) => setForm({ ...form, imamTemplate: event.target.value })}
                  className="w-full rounded-xl border border-[#ded5c4] bg-[#fdfbf7] px-3 py-2.5 font-mono text-xs leading-relaxed text-[#19261f] outline-none focus:border-[#2d946e] focus:ring-2 focus:ring-[#2d946e]/20"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="khatib-template" className="text-xs font-bold text-[#5a685e]">
                  Template pesan Khatib
                </label>
                <textarea
                  id="khatib-template"
                  ref={khatibRef}
                  rows={9}
                  spellCheck={false}
                  value={form.khatibTemplate}
                  onFocus={() => setActiveTemplate("khatib")}
                  onChange={(event) => setForm({ ...form, khatibTemplate: event.target.value })}
                  className="w-full rounded-xl border border-[#ded5c4] bg-[#fdfbf7] px-3 py-2.5 font-mono text-xs leading-relaxed text-[#19261f] outline-none focus:border-[#2d946e] focus:ring-2 focus:ring-[#2d946e]/20"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-[#5a685e]">Variabel:</span>
              {REMINDER_TEMPLATE_VARIABLES.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => insertVariable(variable)}
                  title="Sisipkan ke template yang sedang aktif"
                  className="rounded-lg border border-[#ded5c4] bg-[#fdfbf7] px-2 py-1 font-mono text-[10px] font-semibold text-[#2b594b] hover:bg-[#f4eee2]"
                >
                  {variable}
                </button>
              ))}
              <span className="text-[10px] text-[#8a958d]">
                Klik untuk menyisipkan ke template {activeTemplate === "imam" ? "imam" : "khatib"}.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#f0ebe0] pt-4">
              <Button type="button" onClick={() => void saveSettings()} disabled={saving || !isDirty}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan pengaturan
              </Button>
              <button
                type="button"
                onClick={() => settings && setForm(settings)}
                disabled={!isDirty || saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-xs font-bold text-[#5a685e] hover:bg-[#f4eee2] disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Batalkan perubahan
              </button>
              {isDirty ? (
                <span className="text-[11px] font-semibold text-[#8a6820]">
                  Ada perubahan belum disimpan
                </span>
              ) : (
                <span className="text-[11px] text-[#5a685e]">
                  Aktif: H-{form.offsetDays} jam {form.sendTime} WIB
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Kontrol tanggal & kirim */}
      <Card className="border-[#ded5c4] bg-[#fdfbf7]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <label htmlFor="reminder-date" className="flex items-center gap-1.5 text-xs font-bold text-[#5a685e]">
              <CalendarDays className="h-3.5 w-3.5 text-[#8a6820]" />
              Tanggal tugas yang dipratinkan
            </label>
            <div className="flex items-center gap-2">
              <input
                id="reminder-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-sm font-semibold text-[#19261f] outline-none focus:border-[#2d946e] focus:ring-2 focus:ring-[#2d946e]/20"
              />
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-xs font-bold text-[#5a685e] hover:bg-[#f4eee2] disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Muat ulang
              </button>
            </div>
            {plan ? (
              <p className="text-[11px] text-[#5a685e]">
                Jadwal untuk <span className="font-bold text-[#19261f]">{plan.dateLabel}</span>
                {plan.isFriday ? " • Jumat (termasuk khatib)" : ""}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={() => void send()}
            disabled={loading || !emailConfig?.configured || sending !== null || sendable.length === 0}
            className="min-w-[180px]"
          >
            {sending === "__all__" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Kirim ke {sendable.length} penerima
          </Button>
        </div>

        {plan?.unmatchedNames.length ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#ecd8a6] bg-[#faf4e6] p-3 text-xs text-[#7c6630]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">Nama berikut belum ada di Data Petugas atau ejaannya berbeda:</p>
              <p className="mt-0.5">{plan.unmatchedNames.join(", ")}</p>
              <Link href="/admin/petugas" className="mt-1 inline-block font-bold underline">
                Buka Data Petugas
              </Link>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Daftar penerima */}
      <Card className="border-[#ded5c4] bg-white">
        <SectionHeading
          icon={Mail}
          title="Penerima pengingat"
          description="Satu alamat email menerima satu pesan berisi seluruh tugasnya pada tanggal tersebut. Muadzin tidak termasuk."
        />

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#5a685e]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat jadwal...
          </div>
        ) : plan && plan.recipients.length > 0 ? (
          <div className="space-y-3">
            {plan.recipients.map((recipient) => {
              const isSending = sending === recipient.dedupeKey;
              const isExpanded = expanded === recipient.dedupeKey;
              const usesKhatib = recipient.duties.some((duty) => duty.role === "KHATIB");
              return (
                <div
                  key={recipient.dedupeKey}
                  className="rounded-2xl border border-[#ded5c4] bg-[#fdfbf7] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-[#19261f]">{recipient.name}</p>
                        <RoleBadges roles={recipient.roles} />
                        <StatusBadge status={recipient.status} />
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#5a685e]">
                        <Mail className="h-3.5 w-3.5" />
                        {recipient.email ? (
                          <span className="font-semibold text-[#2b594b]">{recipient.email}</span>
                        ) : recipient.rawEmail ? (
                          <span className="font-semibold text-rose-600">
                            Email tidak valid: {recipient.rawEmail}
                          </span>
                        ) : (
                          <span className="font-semibold text-rose-600">
                            Email belum diisi
                          </span>
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {recipient.duties.map((duty) => (
                          <span
                            key={`${duty.role}-${duty.label}`}
                            className="rounded-lg border border-[#ded5c4] bg-white px-2 py-1 text-[11px] font-semibold text-[#19261f]"
                          >
                            {duty.label}
                          </span>
                        ))}
                      </div>
                      {recipient.status === "SENT" && recipient.sentAt ? (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#1e6149]">
                          <CheckCircle2 className="h-3 w-3" />
                          Terkirim {formatWib(recipient.sentAt)} WIB
                        </p>
                      ) : null}
                      {recipient.error ? (
                        <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{recipient.error}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpanded(isExpanded ? null : recipient.dedupeKey)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-xs font-bold text-[#5a685e] hover:bg-[#f4eee2]"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {isExpanded ? "Tutup pesan" : "Lihat pesan"}
                      </button>
                      {recipient.email ? (
                        <Button
                          type="button"
                          variant={recipient.status === "SENT" ? "secondary" : "primary"}
                          onClick={() => void send([recipient.dedupeKey], recipient.status === "SENT")}
                          disabled={isSending || sending !== null || !emailConfig?.configured}
                          className="px-3 py-2"
                        >
                          {isSending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {recipient.status === "SENT" ? "Kirim ulang" : "Kirim"}
                        </Button>
                      ) : (
                        <Link
                          href="/admin/petugas"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#ecd8a6] bg-[#faf4e6] px-3 py-2 text-xs font-bold text-[#8a6820] hover:bg-[#f5ecd8]"
                        >
                          Isi email
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {isExpanded && form ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a6820]">
                        Template {usesKhatib ? "khatib" : "imam"}
                        {isDirty ? " • pratinjau perubahan belum disimpan" : ""}
                      </p>
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-[#ded5c4] bg-white p-3 text-xs leading-relaxed text-[#19261f]">
                        {previewMessage(recipient, form, plan?.mosqueName ?? "", plan?.dateLabel ?? "")}
                      </pre>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#ded5c4] bg-[#fdfbf7] p-6 text-center text-sm text-[#5a685e]">
            Tidak ada jadwal petugas untuk tanggal ini.
          </div>
        )}
      </Card>

      {/* Riwayat pengiriman */}
      <Card className="border-[#ded5c4] bg-white">
        <SectionHeading
          icon={History}
          title="Riwayat pengingat"
          description="Log ini juga dipakai untuk mencegah pesan terkirim dua kali pada tanggal yang sama."
        />

        {plan && plan.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#ded5c4] text-[10px] uppercase tracking-wider text-[#5c6e63]">
                  <th className="py-2 pr-3">Nama</th>
                  <th className="py-2 pr-3">Tugas</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Waktu</th>
                  <th className="py-2">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {plan.logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#f0ebe0] align-top">
                    <td className="py-2.5 pr-3 font-bold text-[#19261f]">{log.recipientName}</td>
                    <td className="py-2.5 pr-3 text-[#5a685e]">{log.duties || "-"}</td>
                    <td className="py-2.5 pr-3 text-[#5a685e]">{log.email ?? "-"}</td>
                    <td className="py-2.5 pr-3">
                      {log.status === "SENT" ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#1e6149]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Terkirim
                        </span>
                      ) : log.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                          <XCircle className="h-3.5 w-3.5" /> Gagal
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[#8a6820]">
                          <Clock3 className="h-3.5 w-3.5" /> {STATUS_LABEL[log.status]}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-[#5a685e]">{formatWib(log.sentAt ?? log.createdAt)}</td>
                    <td className="py-2.5 text-[#5a685e]">{log.error || log.provider || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#ded5c4] bg-[#fdfbf7] p-6 text-center text-sm text-[#5a685e]">
            Belum ada riwayat pengingat untuk tanggal ini.
          </div>
        )}
      </Card>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Pengiriman otomatis berjalan lewat cron harian sesuai jadwal yang disimpan di atas (
        {form ? `H-${form.offsetDays} jam ${form.sendTime} WIB` : "memuat..."}). Endpoint cron:
        <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
          /api/cron/h-1-reminders
        </code>
        dengan proteksi <code className="font-mono text-[10px]">CRON_SECRET</code>.
      </p>
    </div>
  );
}
