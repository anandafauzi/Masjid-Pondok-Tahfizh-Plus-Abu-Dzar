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
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fdfbf7] via-[#f8f4eb] to-[#f2ece0] p-6 text-[#19261f] shadow-xl border border-[#ded5c4] sm:p-10 lg:p-12">
      {/* Decorative ambient radial glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#3eb489]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#c5a059]/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-islamic-pattern opacity-25" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Arabic Basmalah Calligraphy */}
        <div className="font-arabic text-2xl font-bold tracking-wide text-[#8a6820] sm:text-3xl md:text-4xl drop-shadow-sm">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>

        {/* Mosque Badge & Name */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2d946e]/30 bg-[#2d946e]/10 px-4 py-1 text-xs font-semibold tracking-wider text-[#1e6149]">
          <Sparkles className="h-3.5 w-3.5 text-[#8a6820]" />
          <span>SISTEM INFORMASI MASJID RESMI</span>
        </div>

        <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-[#19261f] sm:text-4xl md:text-5xl lg:text-5xl">
          {mosqueName}
        </h1>

        <p className="mt-2 max-w-2xl text-xs text-[#5c6e63] sm:text-sm">
          {mosqueAddress ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}
        </p>

        {/* Live Clock & Dual Calendar Pill */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-[#3f5045]">
          <div className="flex items-center gap-2 rounded-xl bg-white border border-[#ded5c4] px-4 py-2 shadow-sm">
            <Clock className="h-4 w-4 text-[#2d946e]" />
            <span
              suppressHydrationWarning
              className="font-mono text-base font-bold text-[#19261f] sm:text-lg"
            >
              {mounted ? timeString : "--:--:--"}
            </span>
            <span className="text-[11px] font-bold text-[#2d946e]">WIB</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white border border-[#ded5c4] px-4 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-[#8a6820]" />
            <span
              suppressHydrationWarning
              className="font-semibold text-[#2a382f]"
            >
              {mounted ? dateString : "Memuat..."}
            </span>
            {hijriString && (
              <>
                <span className="text-[#a49782]">•</span>
                <span
                  suppressHydrationWarning
                  className="font-semibold text-[#8a6820]"
                >
                  {mounted ? `${hijriString} H` : ""}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Next Prayer Spotlight Card */}
        <div className="mt-8 w-full max-w-xl rounded-2xl border border-[#bde5d2] bg-gradient-to-r from-[#eef8f3] via-white to-[#eef8f3] p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="inline-block rounded-md bg-[#2d946e]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#1e6149] border border-[#2d946e]/25">
                Shalat Berikutnya
              </span>
              <div className="mt-1 flex items-baseline gap-2 justify-center sm:justify-start">
                <span className="text-2xl font-black text-[#19261f] sm:text-3xl">
                  {nextPrayer.label}
                </span>
                <span className="font-arabic text-lg text-[#8a6820]">
                  {PRAYER_NAMES_ARABIC[nextPrayer.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                </span>
                {nextPrayer.tomorrow && (
                  <span className="text-xs text-[#607066] font-medium">(Besok)</span>
                )}
              </div>
              <p className="font-mono text-2xl font-extrabold text-[#2d946e] sm:text-3xl">
                {nextPrayer.time} <span className="text-xs font-normal text-[#607066]">WIB</span>
              </p>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-[#faf4e6] border border-[#ecd8a6] px-5 py-3 shadow-inner">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7c6630]">
                Menuju Adzan
              </span>
              <span
                suppressHydrationWarning
                className="font-mono text-3xl font-black text-[#8a6820] sm:text-4xl"
              >
                {mounted ? countdownText : "--:--"}
              </span>
              <span className="text-[10px] font-semibold text-[#2d946e]">Hitung Mundur</span>
            </div>
          </div>
        </div>

        {/* 7 Daily Prayer Times Horizontal Grid */}
        <div className="mt-8 w-full">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#607066]">
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
                      ? "border border-[#2d946e] bg-gradient-to-b from-[#2d946e] to-[#206f52] text-white shadow-lg shadow-[#2d946e]/20 ring-2 ring-[#2d946e]/30 scale-105"
                      : "border border-[#ded5c4] bg-white hover:border-[#2d946e]/40 hover:bg-[#fbf9f4] shadow-sm text-[#19261f]"
                  }`}
                >
                  {isNext && (
                    <span className="absolute -top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase text-[#206f52] shadow">
                      Aktif
                    </span>
                  )}
                  <span className={`font-arabic text-xs ${isNext ? "text-[#f4eee2]" : "text-[#8a6820]"}`}>
                    {arabic}
                  </span>
                  <span className={`mt-0.5 text-xs font-semibold ${isNext ? "text-white" : "text-[#3f5045]"}`}>
                    {label}
                  </span>
                  <span
                    className={`mt-1 font-mono text-lg font-bold sm:text-xl ${
                      isNext ? "text-white" : "text-[#19261f]"
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
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2d946e] to-[#206f52] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:from-[#35a87e] hover:to-[#267f5e] active:scale-95 transition-all"
          >
            <span>Jadwal Shalat 7 Hari</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/tv"
            target="_blank"
            className="flex items-center gap-2 rounded-xl border border-[#ded5c4] bg-white px-5 py-2.5 text-xs font-semibold text-[#19261f] shadow-sm hover:bg-[#fbf9f4] hover:border-[#bde5d2] active:scale-95 transition-all"
          >
            <Tv className="h-4 w-4 text-[#2d946e]" />
            <span>Buka TV Display Masjid</span>
          </Link>

          <Link
            href="/adzan-iqamah"
            className="flex items-center gap-2 rounded-xl border border-[#ecd8a6] bg-[#faf4e6] px-5 py-2.5 text-xs font-semibold text-[#7c6630] shadow-sm hover:bg-[#f4ebd0] active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4 text-[#8a6820]" />
            <span>Hitung Mundur Iqamah</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
