"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicShell } from "@/components/public-shell";
import { MuadzinSelectorCard } from "@/components/muadzin-selector";
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
      <div className="mb-8 rounded-3xl border border-slate-200/80 bg-white p-8 text-slate-900 shadow-sm sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sage-50 px-3.5 py-1 text-xs font-semibold text-sage-800 border border-sage-200/80 mb-3">
              <Timer className="h-3.5 w-3.5 text-sage-600" />
              <span>Hitung Mundur Presisi Digital</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Hitung Mundur Adzan &amp; Iqamah
            </h1>
            <p className="mt-2 text-xs text-slate-600 sm:text-sm">
              Memandu jamaah dalam melaksanakan shalat sunnah qobliyah dan merapatkan shaf tepat waktu.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 shadow-sm text-right">
            <span className="text-xs text-slate-500 font-semibold block">Waktu Server (WIB)</span>
            <span
              suppressHydrationWarning
              className="font-mono text-2xl font-black text-sage-700"
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
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-slate-500 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-50 text-sage-600 animate-spin mb-3">
            ⏳
          </div>
          <p className="font-semibold text-slate-900">Sinkronisasi Waktu Masjid...</p>
        </div>
      ) : (
        <>
          {/* Main Giant Countdown Box */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-slate-900 shadow-sm sm:p-14">
            <div className="pointer-events-none absolute inset-0 bg-islamic-pattern opacity-25" />

            <div className="relative z-10 flex flex-col items-center">
              {upcoming ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sage-200/80 bg-sage-50 px-4 py-1 text-xs font-bold uppercase tracking-wider text-sage-800 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-sage-600" />
                    <span>
                      {upcoming.isBetweenAdhanAndIqamah
                        ? "Adzan Selesai • Menuju Iqamah"
                        : "Waktu Shalat Berikutnya"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-3">
                    <p className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
                      {upcoming.label}
                    </p>
                    <span className="font-arabic text-3xl text-sage-700 sm:text-4xl">
                      {PRAYER_NAMES_ARABIC[upcoming.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600 sm:text-base">
                    Waktu Adzan: <span className="font-bold text-slate-900 font-mono">{upcoming.adhanTime}</span>
                    <span className="mx-3 text-slate-300">•</span>
                    Estimasi Iqamah: <span className="font-bold text-sage-700 font-mono">{upcoming.iqamahTime}</span>
                  </p>

                  <div className="my-8 rounded-3xl border border-sage-200/80 bg-sage-50/40 px-8 py-6 shadow-inner sm:px-14 sm:py-8">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                      Sisa Waktu Menuju Iqamah
                    </span>
                    <p
                      suppressHydrationWarning
                      className="font-mono text-6xl font-black tracking-wider text-sage-700 sm:text-8xl md:text-9xl"
                    >
                      {mounted
                        ? countdown(
                            new Date(upcoming.iqamahTarget).getTime(),
                            serverNow
                          )
                        : "--:--:--"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-6 py-2.5 text-xs text-slate-600 max-w-lg shadow-sm">
                    {upcoming.isBetweenAdhanAndIqamah
                      ? "Mari manfaatkan waktu antara adzan dan iqamah untuk memperbanyak doa dan shalat sunnah."
                      : "Hitung mundur mengacu pada jadwal resmi yang diselaraskan dengan server masjid."}
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <CheckCircle2 className="mx-auto h-16 w-16 text-sage-600 mb-4" />
                  <p className="text-2xl font-black text-slate-900">
                    Semua jadwal shalat fardhu hari ini telah selesai.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Jadwal shalat hari esok akan aktif kembali menjelang waktu Subuh.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Daily Schedule Overview Table */}
          <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
              <h3 className="font-bold text-slate-900 text-base">
                Rincian Jadwal Adzan &amp; Iqamah Hari Ini
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-700 text-xs font-bold">
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
                            ? "bg-sage-50/60 font-semibold text-sage-900"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="font-arabic text-sm text-sage-700 font-normal">
                            {PRAYER_NAMES_ARABIC[e.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                          </span>
                          <span>{e.label}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                          {e.adhanTime}
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-black text-sage-700">
                          {e.iqamahTime}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {passed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                              <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                              <span>Selesai</span>
                            </span>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sage-600 px-3 py-1 text-xs font-bold text-white shadow-sm animate-pulse">
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Sedang Berjalan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-700 border border-sage-200">
                              <Clock className="h-3.5 w-3.5 text-sage-600" />
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

          {/* Muadzin Audio & Notification Settings Card */}
          <MuadzinSelectorCard />
        </>
      )}
    </PublicShell>
  );
}
