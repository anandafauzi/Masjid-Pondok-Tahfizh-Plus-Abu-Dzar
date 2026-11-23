"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRAYER_NAMES_ARABIC } from "@/utils/constants";
import { formatHijriDate } from "@/lib/hijri";
import type { PrayerTimesStrings } from "@/lib/prayer-times";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";

interface HomeHeroProps {
  prayerTimes: PrayerTimesStrings;
  nextPrayer: {
    key: string;
    label: string;
    time: string;
    target: string;
    tomorrow: boolean;
  };
  mosqueName: string;
  mosqueAddress: string | null;
  logoUrl?: string | null;
  serverTime?: string;
}

const PRAYERS_LIST = [
  { key: "imsak", label: "Imsak" },
  { key: "fajr", label: "Shubuh" },
  { key: "sunrise", label: "Terbit" },
  { key: "dhuhr", label: "Dzuhur" },
  { key: "asr", label: "Ashar" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isya" },
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function HomeHero({
  prayerTimes,
  nextPrayer,
  mosqueName,
  mosqueAddress,
  logoUrl,
  serverTime,
}: HomeHeroProps) {
  const [now, setNow] = useState<number | null>(null);
  const router = useRouter();
  const refreshingRef = useRef(false);

  useEffect(() => {
    const offset = serverTime ? new Date(serverTime).getTime() - Date.now() : 0;
    const tick = () => setNow(Date.now() + offset);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [serverTime]);

  // Target nextPrayer berasal dari server. Begitu lewat, minta server render
  // ulang agar label dan waktu shalat berikutnya ikut berganti.
  useEffect(() => {
    if (now === null) return;
    const targetMs = new Date(nextPrayer.target).getTime();
    if (now >= targetMs && !refreshingRef.current) {
      refreshingRef.current = true;
      router.refresh();
    } else if (now < targetMs) {
      refreshingRef.current = false;
    }
  }, [now, nextPrayer.target, router]);

  const mounted = now !== null;
  const currentMs = now ?? 0;

  const targetMs = new Date(nextPrayer.target).getTime();
  const diffSec = Math.max(0, Math.floor((targetMs - currentMs) / 1000));
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  const countdownText =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  const ringProgress = mounted
    ? Math.min(100, Math.max(4, (1 - diffSec / (12 * 3600)) * 100))
    : 0;

  const timeString = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(currentMs));

  const dateString = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(currentMs));

  const hijriString = formatHijriDate(currentMs);
  const arabicName =
    PRAYER_NAMES_ARABIC[nextPrayer.key as keyof typeof PRAYER_NAMES_ARABIC] ?? "";

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0b241a] via-[#103d2e] to-[#081a13] text-white shadow-[0_24px_70px_rgba(8,26,19,0.28)] ring-1 ring-white/10">
      {/* Ambient light & geometric wash */}
      <div className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-amber-200/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] opacity-40" />

      <div className="relative z-10 p-6 sm:p-9 lg:p-11">
        {/* Identity row */}
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur sm:h-20 sm:w-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/logo-masjid.png"}
              alt={mosqueName}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="mt-4 min-w-0 sm:ml-5 sm:mt-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
              <Sparkles className="h-3 w-3" /> Sistem Informasi Masjid
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              {mosqueName}
            </h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-emerald-100/70 sm:justify-start">
              <MapPin className="h-3.5 w-3.5" />
              {mosqueAddress ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:ml-auto sm:mt-0 sm:justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur">
              <Clock className="h-4 w-4 text-emerald-300" />
              <span suppressHydrationWarning className="font-mono text-sm font-bold tabular-nums sm:text-base">
                {mounted ? timeString : "--:--:--"}
              </span>
              <span className="text-[10px] font-bold text-emerald-300">WIB</span>
            </div>
            <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 backdrop-blur lg:flex">
              <CalendarDays className="h-4 w-4 text-emerald-300" />
              <span suppressHydrationWarning className="text-xs font-semibold text-emerald-50">
                {mounted ? (hijriString ? `${dateString} · ${hijriString}` : dateString) : "Memuat tanggal..."}
              </span>
            </div>
          </div>
        </div>

        {/* Spotlight */}
        <div className="mt-8 grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-md sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-300/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-100 ring-1 ring-amber-200/20">
                Shalat Berikutnya
              </span>
              {nextPrayer.tomorrow && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100/80">
                  Besok
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
                {nextPrayer.label}
              </h2>
              <span className="font-arabic text-2xl text-emerald-200/90 sm:text-3xl">
                {arabicName}
              </span>
            </div>

            <p className="mt-1 font-mono text-3xl font-black tracking-tight text-amber-200 sm:text-4xl">
              {nextPrayer.time} <span className="text-xs font-bold text-emerald-100/60">WIB</span>
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/jadwal-shalat"
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-300/10 transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Lihat Jadwal <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/adzan-iqamah"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                <Timer className="h-4 w-4 text-emerald-300" /> Hitung Mundur Iqamah
              </Link>
            </div>
          </div>

          {/* Countdown ring */}
          <div className="relative mx-auto flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 180deg, #eddcb2 ${ringProgress}%, rgba(255,255,255,0.10) 0)`,
                filter: "drop-shadow(0 0 24px rgba(237,220,178,0.18))",
              }}
            />
            <div className="absolute inset-[10px] rounded-full bg-gradient-to-br from-[#0d2c21] to-[#081a13] ring-1 ring-white/10" />
            <div className="relative z-10 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/70">
                Menuju Adzan
              </span>
              <span
                suppressHydrationWarning
                className="mt-1 block font-mono text-4xl font-black tabular-nums text-white sm:text-5xl"
              >
                {mounted ? countdownText : "--:--:--"}
              </span>
              <span className="mt-1 block text-[10px] font-semibold text-emerald-100/60">
                {mounted ? hijriString || "..." : "..."}
              </span>
            </div>
          </div>
        </div>

        {/* 7-time grid */}
        <div className="mt-9">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">
              Jadwal Waktu Shalat Hari Ini
            </p>
            <Link
              href="/jadwal-imam"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-200 hover:text-amber-100"
            >
              <Users className="h-3.5 w-3.5" /> Imam &amp; Muadzin
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {PRAYERS_LIST.map(({ key, label }) => {
              const isNext = !nextPrayer.tomorrow && key === nextPrayer.key;
              const time = prayerTimes[key as keyof PrayerTimesStrings] ?? "--:--";
              const arabic = PRAYER_NAMES_ARABIC[key as keyof typeof PRAYER_NAMES_ARABIC];

              return (
                <div
                  key={key}
                  className={`relative flex flex-col items-center justify-center rounded-2xl px-2 py-3.5 text-center transition-all ${
                    isNext
                      ? "bg-amber-300 text-slate-950 shadow-lg shadow-amber-300/15 ring-2 ring-amber-200/40"
                      : "border border-white/10 bg-white/[0.05] text-white hover:bg-white/10"
                  }`}
                >
                  {isNext && (
                    <span className="absolute -top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase text-slate-900 shadow">
                      Aktif
                    </span>
                  )}
                  <span className={`font-arabic text-xs ${isNext ? "text-slate-700" : "text-emerald-200/70"}`}>
                    {arabic}
                  </span>
                  <span className={`mt-0.5 text-[11px] font-bold ${isNext ? "text-slate-800" : "text-emerald-50/80"}`}>
                    {label}
                  </span>
                  <span className={`mt-1 font-mono text-lg font-black ${isNext ? "text-slate-950" : "text-white"}`}>
                    {time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
