"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicShell } from "@/components/public-shell";
import type { TvData } from "@/lib/public-data";
import { PRAYER_NAMES_ARABIC } from "@/utils/constants";
import { Timer, Clock, Sparkles, CheckCircle2 } from "lucide-react";

function countdown(targetMs: number, nowMs: number) {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function AdzanIqamahPage() {
  const [data, setData] = useState<TvData | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/public/tv-data", { cache: "no-store" });
      if (!res.ok) return;
      const d = (await res.json()) as TvData;
      setData(d);
      setOffset(new Date(d.serverTime).getTime() - Date.now());
    } catch {
      // keep last data
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    load();
    const poll = setInterval(load, 30000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  const serverNow = now + offset;

  const nextEvent =
    data?.iqamahEvents.find(
      (e) => new Date(e.iqamahTarget).getTime() > serverNow
    ) ?? null;

  const upcoming = nextEvent
    ? {
        ...nextEvent,
        isBetweenAdhanAndIqamah:
          new Date(nextEvent.adhanTarget).getTime() <= serverNow,
      }
    : null;

  return (
    <PublicShell
      mosque={
        data
          ? {
              name: data.mosque.name,
              address: data.mosque.address,
              mapUrl: data.mosque.mapUrl,
            }
          : undefined
      }
    >
      {/* Header Banner */}
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-8 text-white shadow-xl ring-1 ring-white/10 sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 mb-3">
              <Timer className="h-3.5 w-3.5 text-amber-400" />
              <span>Hitung Mundur Presisi Digital</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Hitung Mundur Adzan &amp; Iqamah
            </h1>
            <p className="mt-2 text-xs text-slate-300 sm:text-sm">
              Memandu jamaah dalam melaksanakan shalat sunnah qobliyah dan merapatkan shaf tepat waktu.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur text-right">
            <span className="text-xs text-slate-400 block">Waktu Server (WIB)</span>
            <span
              suppressHydrationWarning
              className="font-mono text-2xl font-black text-emerald-400"
            >
              {mounted
                ? new Intl.DateTimeFormat("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(serverNow))
                : "--:--:--"}
            </span>
          </div>
        </div>
      </div>

      {!data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 animate-spin mb-3">
            ⏳
          </div>
          <p className="font-semibold text-slate-700">Sinkronisasi Waktu Masjid...</p>
        </div>
      ) : (
        <>
          {/* Main Giant Countdown Box */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 text-center text-white shadow-2xl ring-1 ring-white/10 sm:p-14">
            <div className="pointer-events-none absolute inset-0 bg-islamic-pattern opacity-40" />

            <div className="relative z-10 flex flex-col items-center">
              {upcoming ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {upcoming.isBetweenAdhanAndIqamah
                        ? "Adzan Selesai • Menuju Iqamah"
                        : "Waktu Shalat Berikutnya"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-3">
                    <p className="text-4xl font-black tracking-tight text-white sm:text-6xl md:text-7xl">
                      {upcoming.label}
                    </p>
                    <span className="font-arabic text-3xl text-amber-300/80 sm:text-4xl">
                      {PRAYER_NAMES_ARABIC[upcoming.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-300 sm:text-base">
                    Waktu Adzan: <span className="font-bold text-white font-mono">{upcoming.adhanTime}</span>
                    <span className="mx-3 text-slate-600">•</span>
                    Estimasi Iqamah: <span className="font-bold text-amber-300 font-mono">{upcoming.iqamahTime}</span>
                  </p>

                  <div className="my-8 rounded-3xl border border-white/10 bg-black/40 px-8 py-6 shadow-2xl backdrop-blur ring-1 ring-white/10 sm:px-14 sm:py-8">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
                      Sisa Waktu Menuju Iqamah
                    </span>
                    <p
                      suppressHydrationWarning
                      className="font-mono text-6xl font-black tracking-wider text-amber-400 sm:text-8xl md:text-9xl"
                    >
                      {mounted
                        ? countdown(
                            new Date(upcoming.iqamahTarget).getTime(),
                            serverNow
                          )
                        : "--:--:--"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/10 px-6 py-2.5 text-xs text-slate-300 max-w-lg">
                    {upcoming.isBetweenAdhanAndIqamah
                      ? "Mari manfaatkan waktu antara adzan dan iqamah untuk memperbanyak doa dan shalat sunnah."
                      : "Hitung mundur mengacu pada jadwal resmi yang diselaraskan dengan server masjid."}
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400 mb-4" />
                  <p className="text-2xl font-bold text-white">
                    Semua jadwal shalat fardhu hari ini telah selesai.
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Jadwal shalat hari esok akan aktif kembali menjelang waktu Subuh.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Daily Schedule Overview Table */}
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h3 className="font-bold text-slate-900 text-base">
                Rincian Jadwal Adzan &amp; Iqamah Hari Ini
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs font-semibold">
                    <th className="px-6 py-3.5">Shalat</th>
                    <th className="px-6 py-3.5 text-center">Waktu Adzan</th>
                    <th className="px-6 py-3.5 text-center">Waktu Iqamah</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.iqamahEvents.map((e) => {
                    const iqamahMs = new Date(e.iqamahTarget).getTime();
                    const passed = iqamahMs <= serverNow;
                    const isCurrent = upcoming?.key === e.key;

                    return (
                      <tr
                        key={e.key}
                        className={`transition-colors ${
                          isCurrent
                            ? "bg-emerald-50/80 font-semibold"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="font-arabic text-sm text-amber-700/80 font-normal">
                            {PRAYER_NAMES_ARABIC[e.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                          </span>
                          <span>{e.label}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                          {e.adhanTime}
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-black text-emerald-700">
                          {e.iqamahTime}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {passed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                              <span>Selesai</span>
                            </span>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm animate-pulse">
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Sedang Berjalan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Mendatang</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PublicShell>
  );
}
