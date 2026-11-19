"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TvData } from "@/lib/public-data";
import { PRAYER_NAMES_ARABIC } from "@/utils/constants";
import { CheckCircle2, Home, Maximize2, Minimize2, Sparkles } from "lucide-react";

function countdown(targetMs: number, nowMs: number) {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function AdzanIqamahAppPage() {
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
    <main className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#faf7f2] text-[#19261f] bg-islamic-pattern select-none">
      <header className="relative z-10 flex shrink-0 items-center gap-2 border-b border-[#ded5c4] bg-[#fbf9f4] px-3 py-2 sm:gap-4 sm:px-6 sm:py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data?.mosque.logoUrl || "/logo-masjid.png"}
          alt={data?.mosque.name ?? "Masjid"}
          className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[clamp(0.95rem,3.6vmin,1.5rem)] font-black tracking-tight text-[#19261f]">
            {data?.mosque.name ?? "Masjid Pondok Tahfizh Plus Abu Dzar"}
          </h1>
          <p className="truncate text-[clamp(0.65rem,2.4vmin,0.9rem)] text-[#5a685e]">
            {data?.mosque.address ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}
          </p>
        </div>

        <div className="hidden shrink-0 rounded-lg border border-[#ded5c4] bg-white px-3 py-1 text-right shadow-sm sm:block">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-[#5a685e]">
            Waktu Server · WIB
          </span>
          <span suppressHydrationWarning className="font-mono text-base font-black text-[#1e6149]">
            {clock}
          </span>
        </div>
        <Link
          href="/"
          aria-label="Kembali ke Beranda"
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#ded5c4] bg-white px-2 py-2 text-[clamp(0.7rem,2.6vmin,0.9rem)] font-bold text-[#1e6149] shadow-sm transition-colors hover:bg-[#eef8f3] sm:px-4"
        >
          <Home className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Beranda</span>
        </Link>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2d946e] px-2 py-2 text-[clamp(0.7rem,2.6vmin,0.9rem)] font-bold text-white shadow-sm transition-colors hover:bg-[#35a87e] sm:px-4"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          ) : (
            <Maximize2 className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
          )}
          <span className="hidden sm:inline">
            {isFullscreen ? "Normal" : "Layar Penuh"}
          </span>
        </button>
      </header>

      <section className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-3 py-2 text-center sm:px-8 sm:py-4">
        {!data ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2d946e]/10 text-3xl ring-2 ring-[#2d946e]/30 animate-pulse">
              ⏳
            </div>
            <p className="text-base font-black text-[#19261f] sm:text-2xl">
              Sinkronisasi Waktu Masjid...
            </p>
          </div>
        ) : upcoming ? (
          <div className="flex w-full max-w-4xl flex-col items-center gap-[clamp(0.5rem,2.2vmin,1.5rem)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#bde5d2] bg-[#eef8f3] px-4 py-1.5 text-[clamp(0.65rem,2.4vmin,1rem)] font-bold uppercase tracking-widest text-[#1e6149]">
              <Sparkles className="h-4 w-4 shrink-0 text-[#2d946e]" />
              {upcoming.isBetweenAdhanAndIqamah
                ? "Adzan Selesai • Menuju Iqamah"
                : "Waktu Shalat Berikutnya"}
            </div>

            <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
              <p className="text-[clamp(1.75rem,8vmin,4rem)] font-black leading-tight tracking-tight text-[#19261f]">
                {upcoming.label}
              </p>
              <span className="font-arabic text-[clamp(1.5rem,7vmin,3.5rem)] leading-tight text-[#2d946e]">
                {PRAYER_NAMES_ARABIC[upcoming.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
              </span>
            </div>

            <p className="text-[clamp(0.8rem,3vmin,1.25rem)] font-medium text-[#5a685e]">
              Adzan: <span className="font-mono font-black text-[#19261f]">{upcoming.adhanTime}</span>
              <span className="mx-2 text-[#c9d5cd] sm:mx-4">•</span>
              Iqamah: <span className="font-mono font-black text-[#1e6149]">{upcoming.iqamahTime}</span>
            </p>

            <div className="rounded-2xl border border-[#bde5d2] bg-[#eef8f3]/70 px-[clamp(1rem,6vmin,4rem)] py-[clamp(0.75rem,3vmin,2rem)] shadow-sm sm:rounded-3xl">
              <span className="mb-1 block text-[clamp(0.6rem,2.2vmin,0.85rem)] font-bold uppercase tracking-widest text-[#5a685e] sm:mb-2">
                {upcoming.isBetweenAdhanAndIqamah
                  ? "Sisa Waktu Menuju Iqamah"
                  : "Sisa Waktu Menuju Adzan"}
              </span>
              <p suppressHydrationWarning className="font-mono text-[clamp(2.75rem,14vmin,7rem)] font-black leading-none tracking-wider text-[#1e6149]">
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

            <p className="max-w-2xl rounded-xl border border-[#ded5c4] bg-white px-4 py-2 text-[clamp(0.7rem,2.6vmin,1.05rem)] font-semibold text-[#5a685e] shadow-sm sm:px-6 sm:py-3">
              {upcoming.isBetweenAdhanAndIqamah
                ? "Mari manfaatkan waktu antara adzan dan iqamah untuk memperbanyak doa dan shalat sunnah."
                : "Hitung mundur mengacu pada jadwal resmi yang diselaraskan dengan server masjid."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="h-14 w-14 text-[#2d946e] sm:h-20 sm:w-20" />
            <p className="text-xl font-black text-[#19261f] sm:text-3xl">
              Semua jadwal shalat fardhu hari ini telah selesai.
            </p>
            <p className="text-sm text-[#5a685e] sm:text-lg">
              Jadwal shalat hari esok akan aktif kembali menjelang waktu Subuh.
            </p>
          </div>
        )}
      </section>

      <footer className="relative z-10 shrink-0 border-t border-[#ded5c4] bg-[#fbf9f4] px-2 py-2 sm:px-6 sm:py-3">
        <div className="grid grid-cols-5 gap-1 sm:gap-3">
          {visibleEvents.map((e) => {
            const iqamahMs = new Date(e.iqamahTarget).getTime();
            const passed = iqamahMs <= serverNow;
            const isCurrent = upcoming?.key === e.key;

            return (
              <div
                key={e.key}
                className={`rounded-lg border px-1 py-1.5 text-center shadow-sm sm:rounded-xl sm:px-3 sm:py-2 ${
                  isCurrent
                    ? "border-[#2d946e] bg-[#eef8f3]"
                    : "border-[#ded5c4] bg-white"
                }`}
              >
                <p className="flex items-center justify-center gap-1 text-[clamp(0.6rem,2.2vmin,0.9rem)] font-black text-[#19261f] sm:gap-2">
                  <span className="font-arabic text-[clamp(0.65rem,2.4vmin,1rem)] font-normal text-[#2d946e]">
                    {PRAYER_NAMES_ARABIC[e.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                  </span>
                  <span className="truncate">{e.label}</span>
                </p>
                <p className="mt-1 font-mono text-[clamp(0.55rem,2vmin,0.8rem)] font-bold text-[#5a685e]">
                  {e.adhanTime} <span className="text-[#c9d5cd]">/</span>{" "}
                  <span className="text-[#1e6149]">{e.iqamahTime}</span>
                </p>
                <p className={`mt-1 text-[clamp(0.5rem,1.8vmin,0.7rem)] font-bold uppercase tracking-wider ${
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
  );
}
