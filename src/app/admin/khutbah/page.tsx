"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  LoadingState,
  PageHeader,
  SectionHeading,
  Select,
} from "@/components/ui";
import {
  CalendarDays,
  History,
  OctagonX,
  Play,
  Radio,
  TimerReset,
} from "lucide-react";

interface KhutbahSession {
  id: string;
  fridayDate: string;
  khatibName: string;
  sermonTopic: string | null;
  status: string;
  startMode: string;
  startedAt: string;
  endsAt: string;
  durationMinutes: number;
  scheduledStartAt: string | null;
}

const toYmd = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function remaining(endsAt: string, nowMs: number) {
  const diff = Math.floor((new Date(endsAt).getTime() - nowMs) / 1000);
  if (diff <= 0) return "Selesai otomatis";
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m} menit ${String(s).padStart(2, "0")} detik tersisa`;
}

export default function AdminKhutbahPage() {
  const [sessions, setSessions] = useState<KhutbahSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [khatib, setKhatib] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(40);
  const [mode, setMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [scheduledStartAt, setScheduledStartAt] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/khutbah/sessions", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setSessions(data);
    } catch {
      toast.error("Gagal memuat sesi khutbah");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 15000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  const active =
    sessions.find(
      (s) =>
        s.status === "ACTIVE" && new Date(s.startedAt).getTime() <= now
    ) ?? null;
  const scheduled =
    sessions.find(
      (s) =>
        s.status === "ACTIVE" && new Date(s.startedAt).getTime() > now
    ) ?? null;

  async function action(path: string, payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/khutbah/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses");
      toast.success("Berhasil");
      await load();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (active || scheduled) {
      return toast.error("Masih ada sesi khutbah aktif atau terjadwal");
    }
    if (mode === "AUTO" && !scheduledStartAt) {
      return toast.error("Pilih waktu mulai untuk mode terjadwal");
    }

    const ok = await action("start", {
      khatibName: khatib || undefined,
      sermonTopic: topic || null,
      durationMinutes: duration,
      startMode: mode,
      scheduledStartAt:
        mode === "AUTO" && scheduledStartAt
          ? new Date(scheduledStartAt).toISOString()
          : undefined,
    });

    if (ok) {
      setKhatib("");
      setTopic("");
      setScheduledStartAt("");
    }
  }

  return (
    <div>
      <PageHeader
        icon={Radio}
        title="Khutbah Jumat"
        description="Kelola sesi khutbah. TV tidak menampilkan hitung mundur saat khutbah berlangsung."
        action={
          <Badge color={active ? "red" : scheduled ? "amber" : "slate"}>
            {active
              ? "Sesi Aktif"
              : scheduled
                ? "Terjadwal"
                : "Tidak Ada Sesi"}
          </Badge>
        }
      />

      {scheduled && (
        <Card className="mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color="amber">Terjadwal</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {toYmd(scheduled.fridayDate)}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {scheduled.khatibName}
                </h2>
                {scheduled.sermonTopic && (
                  <p className="text-sm text-slate-600">
                    “{scheduled.sermonTopic}”
                  </p>
                )}
                <p className="mt-2 text-sm font-bold text-amber-700">
                  Mulai{" "}
                  {new Date(scheduled.startedAt).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta",
                  })}{" "}
                  WIB
                </p>
                <p className="text-xs text-slate-500">
                  Durasi {scheduled.durationMinutes} menit • TV akan beralih
                  otomatis saat waktu mulai tiba.
                </p>
              </div>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  action("cancel", { id: scheduled.id })
                }
              >
                <OctagonX className="h-4 w-4" /> Batalkan Jadwal
              </Button>
            </div>
          </div>
        </Card>
      )}

      {active && (
        <Card className="mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color="green">Sedang berlangsung</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {toYmd(active.fridayDate)} • {active.startMode}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {active.khatibName}
                </h2>
                {active.sermonTopic && (
                  <p className="text-sm text-slate-600">“{active.sermonTopic}”</p>
                )}
                <p className="mt-2 text-sm font-bold text-emerald-700">
                  {remaining(active.endsAt, now)}
                </p>
                <p className="text-xs text-slate-500">
                  Durasi {active.durationMinutes} menit • Berakhir{" "}
                  {new Date(active.endsAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  WIB
                </p>
              </div>
              <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-1 ring-rose-200">
                <Radio className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[5, 10].map((m) => (
                <Button
                  key={m}
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    action("extend", { id: active.id, extraMinutes: m })
                  }
                >
                  <TimerReset className="h-4 w-4" /> +{m} menit
                </Button>
              ))}
              <Button
                variant="success"
                disabled={busy}
                onClick={() => action("end", { id: active.id })}
              >
                <OctagonX className="h-4 w-4" /> Akhiri
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => action("cancel", { id: active.id })}
              >
                Batalkan
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-6 max-w-4xl">
        <SectionHeading
          icon={Play}
          title="Mulai Khutbah Baru"
          description="Sesi akan berakhir otomatis sesuai durasi berbasis waktu server."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="khatib">Nama Khatib (opsional)</Label>
            <Input
              id="khatib"
              value={khatib}
              onChange={(e) => setKhatib(e.target.value)}
              placeholder="Kosongkan untuk otomatis"
            />
          </div>
          <div>
            <Label htmlFor="topic">Tema Khutbah</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="duration">Durasi (menit)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="mode">Mode Mulai</Label>
            <Select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as "MANUAL" | "AUTO")}
            >
              <option value="MANUAL">Manual (sekarang)</option>
              <option value="AUTO">Terjadwal</option>
            </Select>
          </div>
          {mode === "AUTO" && (
            <div className="sm:col-span-2">
              <Label htmlFor="scheduled">Waktu Mulai</Label>
              <Input
                id="scheduled"
                type="datetime-local"
                required
                value={scheduledStartAt}
                onChange={(e) => setScheduledStartAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Gunakan waktu perangkat yang sesuai zona WIB.
              </p>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Button
            onClick={start}
            disabled={
              busy ||
              Boolean(active) ||
              Boolean(scheduled) ||
              (mode === "AUTO" && !scheduledStartAt)
            }
          >
            <Play className="h-4 w-4" /> Mulai Khutbah
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeading
          icon={History}
          title="Riwayat Sesi"
          description="Catatan sesi khutbah yang pernah dijalankan."
        />
        {loading ? (
          <LoadingState />
        ) : sessions.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            Belum ada sesi khutbah.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#ded5c4] bg-[#f4eee2] text-[11px] font-bold uppercase tracking-wider text-[#19261f]">
                  <th className="rounded-l-xl px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Khatib</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Mulai</th>
                  <th className="rounded-r-xl px-4 py-3">Berakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 text-slate-600">
                      {toYmd(s.fridayDate)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {s.khatibName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={
                          s.status === "ACTIVE"
                            ? "green"
                            : s.status === "CANCELLED"
                              ? "red"
                              : "slate"
                        }
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(s.startedAt).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(s.endsAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
