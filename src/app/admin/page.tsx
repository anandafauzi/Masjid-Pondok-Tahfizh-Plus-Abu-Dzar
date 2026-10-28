"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Radio,
  Clock,
  Plus,
  OctagonX,
  TimerReset,
  Play,
  CalendarClock,
  Users,
  MonitorPlay,
  LayoutDashboard,
  ChevronRight,
  ScrollText,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  SectionHeading,
  Select,
} from "@/components/ui";

interface Session {
  id: string;
  khatibName: string;
  sermonTopic: string | null;
  endsAt: string;
  startedAt: string;
  durationMinutes: number;
}

interface StatusResponse {
  active: boolean;
  serverTime: string;
  session: Session | null;
  scheduled: Session | null;
}

const QUICK_ACTIONS = [
  {
    href: "/tv",
    label: "Buka TV Display",
    description: "Pratinjau layar masjid",
    icon: MonitorPlay,
    external: true,
  },
  {
    href: "/admin/prayer-times",
    label: "Jadwal Shalat",
    description: "14 hari ke depan",
    icon: CalendarClock,
    external: false,
  },
  {
    href: "/admin/imam",
    label: "Imam & Muadzin",
    description: "Atur petugas shalat",
    icon: Users,
    external: false,
  },
  {
    href: "/admin/khutbah",
    label: "Riwayat Khutbah",
    description: "Sesi & riwayat Jumat",
    icon: ScrollText,
    external: false,
  },
] as const;

function wibTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function countdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function AdminDashboardPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  const [khatibName, setKhatibName] = useState("");
  const [sermonTopic, setSermonTopic] = useState("");
  const [duration, setDuration] = useState(40);
  const [startMode, setStartMode] = useState<"MANUAL" | "AUTO">("MANUAL");
  const [scheduledStartAt, setScheduledStartAt] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/khutbah/status", { cache: "no-store" });
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
      setOffset(new Date(data.serverTime).getTime() - Date.now());
    } catch {
      // ignore transient errors
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, 10000);
    const clock = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [fetchStatus]);

  const serverNow = tick + offset;

  const remaining = useMemo(() => {
    if (!status?.session) return 0;
    return new Date(status.session.endsAt).getTime() - serverNow;
  }, [status, serverNow]);

  async function startKhutbah() {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        khatibName: khatibName || undefined,
        sermonTopic: sermonTopic || null,
        durationMinutes: duration,
        startMode,
      };
      if (startMode === "AUTO" && scheduledStartAt) {
        payload.scheduledStartAt = new Date(scheduledStartAt).toISOString();
      }
      const res = await fetch("/api/khutbah/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai khutbah");
      toast.success("Mode khutbah diaktifkan");
      setKhatibName("");
      setSermonTopic("");
      await fetchStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memulai khutbah");
    } finally {
      setLoading(false);
    }
  }

  async function action(path: string, body: Record<string, unknown>, success: string) {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses");
      toast.success(success);
      await fetchStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses");
    } finally {
      setLoading(false);
    }
  }

  const active = Boolean(status?.session);
  const scheduled = status?.scheduled ?? null;

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard Admin"
        description="Ringkasan dan kontrol operasional masjid. Sinkronisasi menggunakan waktu server."
        action={
          <Badge color={active ? "red" : scheduled ? "amber" : "green"}>
            {active
              ? "Khutbah Aktif"
              : scheduled
                ? "Khutbah Terjadwal"
                : "Sistem Normal"}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionHeading
            icon={Radio}
            title="Kontrol Khutbah Jumat"
            description="Aktifkan mode khutbah agar TV menampilkan layar khutbah tanpa hitung mundur."
            action={
              <Badge color={active ? "red" : scheduled ? "amber" : "slate"}>
                {active ? "AKTIF" : scheduled ? "TERJADWAL" : "TIDAK AKTIF"}
              </Badge>
            }
          />

          {active && status?.session ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Sedang Berlangsung
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {status.session.khatibName}
                    </p>
                    {status.session.sermonTopic && (
                      <p className="text-sm text-slate-600">
                        “{status.session.sermonTopic}”
                      </p>
                    )}
                  </div>
                  <span className="flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-1 ring-rose-200">
                    <Radio className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Dimulai
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                      {wibTime(status.session.startedAt)} WIB
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Durasi
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                      {status.session.durationMinutes} menit
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 ring-1 ring-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Sisa (internal)
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-emerald-700">
                      {countdown(remaining)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={loading}
                  onClick={() =>
                    action(
                      "/api/khutbah/extend",
                      { id: status.session!.id, extraMinutes: 5 },
                      "Khutbah diperpanjang 5 menit"
                    )
                  }
                >
                  <TimerReset className="h-4 w-4" /> +5 menit
                </Button>
                <Button
                  variant="secondary"
                  disabled={loading}
                  onClick={() =>
                    action(
                      "/api/khutbah/extend",
                      { id: status.session!.id, extraMinutes: 10 },
                      "Khutbah diperpanjang 10 menit"
                    )
                  }
                >
                  <TimerReset className="h-4 w-4" /> +10 menit
                </Button>
                <Button
                  variant="danger"
                  disabled={loading}
                  onClick={() =>
                    action(
                      "/api/khutbah/end",
                      { id: status.session!.id },
                      "Khutbah diakhiri"
                    )
                  }
                >
                  <OctagonX className="h-4 w-4" /> Akhiri Sekarang
                </Button>
                <Button
                  variant="ghost"
                  disabled={loading}
                  onClick={() =>
                    action(
                      "/api/khutbah/cancel",
                      { id: status.session!.id },
                      "Sesi khutbah dibatalkan"
                    )
                  }
                >
                  Batalkan Sesi
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduled && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                        Terjadwal
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {scheduled.khatibName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Mulai {wibTime(scheduled.startedAt)} WIB ·{" "}
                        {scheduled.durationMinutes} menit
                      </p>
                    </div>
                    <CalendarClock className="h-5 w-5 shrink-0 text-amber-600" />
                  </div>
                  <Button
                    variant="danger"
                    className="mt-3"
                    disabled={loading}
                    onClick={() =>
                      action(
                        "/api/khutbah/cancel",
                        { id: scheduled.id },
                        "Jadwal khutbah dibatalkan"
                      )
                    }
                  >
                    Batalkan Jadwal
                  </Button>
                </div>
              )}
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">
                Aktifkan mode khutbah saat khutbah Jumat dimulai. Sesi akan
                berakhir otomatis sesuai durasi (berbasis waktu server).
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="khatib">Nama Khatib</Label>
                  <Input
                    id="khatib"
                    value={khatibName}
                    onChange={(e) => setKhatibName(e.target.value)}
                    placeholder="Kosongkan untuk otomatis dari jadwal"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Tema Khutbah</Label>
                  <Input
                    id="topic"
                    value={sermonTopic}
                    onChange={(e) => setSermonTopic(e.target.value)}
                    placeholder="Opsional"
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
                    value={startMode}
                    onChange={(e) =>
                      setStartMode(e.target.value as "MANUAL" | "AUTO")
                    }
                  >
                    <option value="MANUAL">Manual (sekarang)</option>
                    <option value="AUTO">Terjadwal</option>
                  </Select>
                </div>
                {startMode === "AUTO" && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="scheduled">Waktu Mulai</Label>
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      required
                      value={scheduledStartAt}
                      onChange={(e) => setScheduledStartAt(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <Button
                onClick={startKhutbah}
                disabled={
                  loading ||
                  Boolean(scheduled) ||
                  (startMode === "AUTO" && !scheduledStartAt)
                }
              >
                <Play className="h-4 w-4" /> Mulai Khutbah Jumat
              </Button>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-5 text-white shadow-lg ring-1 ring-white/10">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                <Clock className="h-4 w-4" />
                Waktu Server
              </div>
              <p className="mt-3 font-mono text-4xl font-black tracking-tight text-emerald-300">
                {new Intl.DateTimeFormat("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "Asia/Jakarta",
                }).format(new Date(serverNow))}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "full",
                  timeZone: "Asia/Jakarta",
                }).format(new Date(serverNow))}
              </p>
              <span className="mt-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                WIB (UTC+7)
              </span>
            </div>
          </div>

          <Card>
            <SectionHeading
              icon={Plus}
              title="Aksi Cepat"
              description="Pintasan menu yang sering dibuka."
            />
            <div className="space-y-2">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 transition-all hover:border-emerald-200 hover:bg-emerald-50/60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-slate-200 group-hover:ring-emerald-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-800">
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
