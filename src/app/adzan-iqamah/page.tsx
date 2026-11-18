"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TvViewport } from "@/components/tv/tv-viewport";
import type { TvData } from "@/lib/public-data";
import { PRAYER_NAMES_ARABIC } from "@/utils/constants";
import { CheckCircle2, Maximize2, Minimize2, Sparkles } from "lucide-react";

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
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // WebView atau browser tidak mengizinkan fullscreen.
    }
  };

  const serverNow = now + offset;

  const isFriday = data?.isFriday ?? false;
  const visibleEvents = data
    ? data.iqamahEvents.filter((e) => !(isFriday && e.key === "dhuhr"))
    : [];

  const nextEvent =
    visibleEvents.find(
      (e) => new Date(e.iqamahTarget).getTime() > serverNow
    ) ?? null;

  const upcoming = nextEvent
    ? {
        ...nextEvent,
        isBetweenAdhanAndIqamah:
          new Date(nextEvent.adhanTarget).getTime() <= serverNow,
      }
    : null;

  const clock = mounted
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(serverNow))
    : "--:--:--";

  return (
    <TvViewport>
      <main className="relative flex h-full w-full flex-col overflow-hidden bg-[#faf7f2] text-[#19261f] bg-islamic-pattern select-none">
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-6 border-b border-[#ded5c4] bg-[#fbf9f4] px-10 py-4">
          <div className="flex min-w-0 items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data?.mosque.logoUrl || "/logo-masjid.png"}
              alt={data?.mosque.name ?? "Masjid"}
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-tight text-[#19261f]">
                {data?.mosque.name ?? "Masjid Pondok Tahfizh Plus Abu Dzar"}
              </h1>
              <p className="truncate text-sm text-[#5a685e]">
                {data?.mosque.address ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <div className="rounded-xl border border-[#ded5c4] bg-white px-5 py-2 text-right shadow-sm">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-[#5a685e]">
                Waktu Server · WIB
              </span>
              <span suppressHydrationWarning className="font-mono text-2xl font-black text-[#1e6149]">
                {clock}
              </span>
            </div>
            <Link
              href="/tv"
              className="rounded-xl border border-[#ded5c4] bg-white px-4 py-2.5 text-sm font-bold text-[#1e6149] shadow-sm transition-colors hover:bg-[#eef8f3]"
            >
              Layar TV
            </Link>
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
              className="flex items-center gap-2 rounded-xl bg-[#2d946e] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#35a87e]"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              {isFullscreen ? "Normal" : "Layar Penuh"}
            </button>
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-10 py-6 text-center">
          {!data ? (
            <div>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2d946e]/10 text-4xl ring-2 ring-[#2d946e]/30 animate-pulse">
                ⏳
              </div>
              <p className="text-2xl font-black text-[#19261f]">Sinkronisasi Waktu Masjid...</p>
            </div>
          ) : upcoming ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#bde5d2] bg-[#eef8f3] px-6 py-2 text-sm font-bold uppercase tracking-widest text-[#1e6149]">
                <Sparkles className="h-4 w-4 text-[#2d946e]" />
                {upcoming.isBetweenAdhanAndIqamah
                  ? "Adzan Selesai • Menuju Iqamah"
                  : "Waktu Shalat Berikutnya"}
              </div>

              <div className="mt-4 flex items-baseline justify-center gap-5">
                <p className="text-6xl font-black tracking-tight text-[#19261f]">
                  {upcoming.label}
                </p>
                <span className="font-arabic text-5xl text-[#2d946e]">
                  {PRAYER_NAMES_ARABIC[upcoming.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                </span>
              </div>

              <p className="mt-3 text-xl font-medium text-[#5a685e]">
                Adzan: <span className="font-mono font-black text-[#19261f]">{upcoming.adhanTime}</span>
                <span className="mx-4 text-[#c9d5cd]">•</span>
                Iqamah: <span className="font-mono font-black text-[#1e6149]">{upcoming.iqamahTime}</span>
              </p>

              <div className="my-7 rounded-3xl border border-[#bde5d2] bg-[#eef8f3]/70 px-16 py-6 shadow-sm">
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#5a685e]">
                  {upcoming.isBetweenAdhanAndIqamah
                    ? "Sisa Waktu Menuju Iqamah"
                    : "Sisa Waktu Menuju Adzan"}
                </span>
                <p suppressHydrationWarning className="font-mono text-8xl font-black tracking-wider text-[#1e6149]">
                  {mounted
                    ? countdown(
                        upcoming.isBetweenAdhanAndIqamah
                          ? new Date(upcoming.iqamahTarget).getTime()
                          : new Date(upcoming.adhanTarget).getTime(),
                        serverNow
                      )
                    : "--:--:--"}
                </p>
              </div>

              <p className="max-w-3xl rounded-xl border border-[#ded5c4] bg-white px-6 py-3 text-base font-semibold text-[#5a685e] shadow-sm">
                {upcoming.isBetweenAdhanAndIqamah
                  ? "Mari manfaatkan waktu antara adzan dan iqamah untuk memperbanyak doa dan shalat sunnah."
                  : "Hitung mundur mengacu pada jadwal resmi yang diselaraskan dengan server masjid."}
              </p>
            </>
          ) : (
            <div>
              <CheckCircle2 className="mx-auto mb-5 h-20 w-20 text-[#2d946e]" />
              <p className="text-3xl font-black text-[#19261f]">
                Semua jadwal shalat fardhu hari ini telah selesai.
              </p>
              <p className="mt-3 text-lg text-[#5a685e]">
                Jadwal shalat hari esok akan aktif kembali menjelang waktu Subuh.
              </p>
            </div>
          )}
        </div>

        <footer className="relative z-10 shrink-0 border-t border-[#ded5c4] bg-[#fbf9f4] px-10 py-4">
          <div className="grid grid-cols-5 gap-4">
            {visibleEvents.map((e) => {
              const iqamahMs = new Date(e.iqamahTarget).getTime();
              const passed = iqamahMs <= serverNow;
              const isCurrent = upcoming?.key === e.key;

              return (
                <div
                  key={e.key}
                  className={`rounded-xl border px-4 py-3 text-center shadow-sm ${
                    isCurrent
                      ? "border-[#2d946e] bg-[#eef8f3]"
                      : "border-[#ded5c4] bg-white"
                  }`}
                >
                  <p className="flex items-center justify-center gap-2 text-sm font-black text-[#19261f]">
                    <span className="font-arabic text-base font-normal text-[#2d946e]">
                      {PRAYER_NAMES_ARABIC[e.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                    </span>
                    {e.label}
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#5a685e]">
                    {e.adhanTime} <span className="text-[#c9d5cd]">/</span>{" "}
                    <span className="text-[#1e6149]">{e.iqamahTime}</span>
                  </p>
                  <p className={`mt-1 text-[11px] font-bold uppercase tracking-wider ${
                    isCurrent ? "text-[#2d946e]" : passed ? "text-[#94a39a]" : "text-[#7c6630]"
                  }`}>
                    {passed ? "Selesai" : isCurrent ? "Sedang Berjalan" : "Mendatang"}
                  </p>
                </div>
              );
            })}
          </div>
        </footer>
      </main>
    </TvViewport>
  );
}
