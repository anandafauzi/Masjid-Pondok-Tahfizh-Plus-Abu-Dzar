"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRAYER_NAMES_ARABIC } from "@/utils/constants";
import type { PrayerTimesStrings } from "@/lib/prayer-times";
import { Clock, Calendar, Tv, ArrowRight, Sparkles } from "lucide-react";

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
}

const PRAYERS_LIST = [
  { key: "imsak", label: "Imsak" },
  { key: "fajr", label: "Subuh" },
  { key: "sunrise", label: "Terbit" },
  { key: "dhuhr", label: "Zuhur" },
  { key: "asr", label: "Asar" },
  { key: "maghrib", label: "Magrib" },
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
}: HomeHeroProps) {
  const [now, setNow] = useState(Date.now());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const targetMs = new Date(nextPrayer.target).getTime();
  const diffSec = Math.max(0, Math.floor((targetMs - now) / 1000));
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  const countdownText =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  const timeString = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(now));

  const dateString = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(now));

  let hijriString = "";
  try {
    hijriString = new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(now));
  } catch {
    hijriString = "";
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1811] via-[#11231a] to-[#162c21] p-6 text-white shadow-2xl ring-1 ring-white/10 sm:p-10 lg:p-12">
      {/* Decorative ambient radial glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#3eb489]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#c5a059]/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-islamic-pattern opacity-40" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Arabic Basmalah Calligraphy */}
        <div className="font-arabic text-2xl font-bold tracking-wide text-[#eddcb2] sm:text-3xl md:text-4xl drop-shadow">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>

        {/* Mosque Badge & Name */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#3eb489]/30 bg-[#3eb489]/15 px-4 py-1 text-xs font-semibold tracking-wider text-[#a5e4cb] backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-[#eddcb2]" />
          <span>SISTEM INFORMASI MASJID RESMI</span>
        </div>

        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-5xl">
          {mosqueName}
        </h1>

        <p className="mt-2 max-w-2xl text-xs text-[#b8ccc0] sm:text-sm">
          {mosqueAddress ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}
        </p>

        {/* Live Clock & Dual Calendar Pill */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-[#d1ded7]">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 ring-1 ring-white/10 backdrop-blur">
            <Clock className="h-4 w-4 text-[#3eb489]" />
            <span
              suppressHydrationWarning
              className="font-mono text-base font-bold text-white sm:text-lg"
            >
              {mounted ? timeString : "--:--:--"}
            </span>
            <span className="text-[11px] font-semibold text-[#8fd2b5]">WIB</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 ring-1 ring-white/10 backdrop-blur">
            <Calendar className="h-4 w-4 text-[#c5a059]" />
            <span
              suppressHydrationWarning
              className="font-medium text-slate-200"
            >
              {mounted ? dateString : "Memuat..."}
            </span>
            {hijriString && (
              <>
                <span className="text-slate-500">•</span>
                <span
                  suppressHydrationWarning
                  className="font-medium text-[#eddcb2]"
                >
                  {mounted ? `${hijriString} H` : ""}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Next Prayer Spotlight Card */}
        <div className="mt-8 w-full max-w-xl rounded-2xl border border-[#3eb489]/40 bg-gradient-to-r from-[#163326]/90 via-[#11231a]/95 to-[#163326]/90 p-5 shadow-xl backdrop-blur-xl ring-1 ring-[#3eb489]/25">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="inline-block rounded-md bg-[#3eb489]/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#a5e4cb] border border-[#3eb489]/30">
                Shalat Berikutnya
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white sm:text-3xl">
                  {nextPrayer.label}
                </span>
                <span className="font-arabic text-lg text-[#eddcb2]/80">
                  {PRAYER_NAMES_ARABIC[nextPrayer.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                </span>
                {nextPrayer.tomorrow && (
                  <span className="text-xs text-slate-400">(Besok)</span>
                )}
              </div>
              <p className="font-mono text-2xl font-extrabold text-[#8fd2b5] sm:text-3xl">
                {nextPrayer.time} <span className="text-xs font-normal text-slate-400">WIB</span>
              </p>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-black/45 px-5 py-3 ring-1 ring-[#c5a059]/30">
              <span className="text-[10px] uppercase tracking-wider text-[#9db3a6]">
                Menuju Adzan
              </span>
              <span
                suppressHydrationWarning
                className="font-mono text-3xl font-black text-[#eddcb2] sm:text-4xl"
              >
                {mounted ? countdownText : "--:--"}
              </span>
              <span className="text-[10px] text-[#8fd2b5]">Hitung Mundur</span>
            </div>
          </div>
        </div>

        {/* 7 Daily Prayer Times Horizontal Grid */}
        <div className="mt-8 w-full">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9db3a6]">
            Jadwal Waktu Shalat Hari Ini
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {PRAYERS_LIST.map(({ key, label }) => {
              const isNext = key === nextPrayer.key;
              const time = prayerTimes[key as keyof PrayerTimesStrings] ?? "--:--";
              const arabic = PRAYER_NAMES_ARABIC[key as keyof typeof PRAYER_NAMES_ARABIC];

              return (
                <div
                  key={key}
                  className={`group relative flex flex-col items-center justify-center rounded-xl p-3.5 transition-all duration-300 ${
                    isNext
                      ? "border border-[#3eb489] bg-[#3eb489]/25 shadow-lg shadow-[#0a1711]/60 ring-2 ring-[#3eb489]/40 scale-105"
                      : "border border-white/10 bg-white/5 hover:border-[#3eb489]/30 hover:bg-white/10"
                  }`}
                >
                  {isNext && (
                    <span className="absolute -top-2 rounded-full bg-[#2d946e] px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow">
                      Aktif
                    </span>
                  )}
                  <span className="font-arabic text-xs text-[#eddcb2]/70 group-hover:text-[#eddcb2]">
                    {arabic}
                  </span>
                  <span className="mt-0.5 text-xs font-semibold text-slate-200">
                    {label}
                  </span>
                  <span
                    className={`mt-1 font-mono text-lg font-bold sm:text-xl ${
                      isNext ? "text-[#a5e4cb]" : "text-white"
                    }`}
                  >
                    {time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick CTA Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/jadwal-shalat"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2d946e] to-[#205e48] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#0a1711]/40 hover:from-[#35a87e] hover:to-[#266d54] active:scale-95 transition-all"
          >
            <span>Jadwal Shalat 7 Hari</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/tv"
            target="_blank"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/20 active:scale-95 transition-all"
          >
            <Tv className="h-4 w-4 text-[#8fd2b5]" />
            <span>Buka TV Display Masjid</span>
          </Link>

          <Link
            href="/adzan-iqamah"
            className="flex items-center gap-2 rounded-xl border border-[#c5a059]/40 bg-[#c5a059]/15 px-5 py-2.5 text-xs font-semibold text-[#eddcb2] hover:bg-[#c5a059]/25 active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4 text-[#eddcb2]" />
            <span>Hitung Mundur Iqamah</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
