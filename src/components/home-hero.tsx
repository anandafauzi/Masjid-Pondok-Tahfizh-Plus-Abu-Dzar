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
    <section className="relative overflow-hidden rounded-3xl bg-white p-6 text-slate-800 shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-slate-100 sm:p-10 lg:p-12">
      {/* Subtle background ambient glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#557a64]/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#557a64]/5 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Arabic Basmalah Calligraphy */}
        <div className="font-arabic text-2xl font-bold tracking-wide text-[#395243] sm:text-3xl md:text-4xl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>

        {/* Mosque Badge & Name */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d2dfd6] bg-[#f4f7f5] px-4 py-1 text-xs font-semibold tracking-wide text-[#466553]">
          <Sparkles className="h-3.5 w-3.5 text-[#557a64]" />
          <span>SISTEM INFORMASI MASJID RESMI</span>
        </div>

        <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          {mosqueName}
        </h1>

        <p className="mt-2 max-w-2xl text-xs text-slate-500 sm:text-sm">
          {mosqueAddress ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}
        </p>

        {/* Live Clock & Dual Calendar Pill */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-600">
          <div className="flex items-center gap-2 rounded-xl bg-[#fbfdfc] border border-slate-200/80 px-4 py-2 shadow-sm">
            <Clock className="h-4 w-4 text-[#557a64]" />
            <span
              suppressHydrationWarning
              className="font-mono text-base font-bold text-slate-900 sm:text-lg"
            >
              {mounted ? timeString : "--:--:--"}
            </span>
            <span className="text-[11px] font-bold text-[#557a64]">WIB</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-[#fbfdfc] border border-slate-200/80 px-4 py-2 shadow-sm">
            <Calendar className="h-4 w-4 text-[#557a64]" />
            <span
              suppressHydrationWarning
              className="font-semibold text-slate-700"
            >
              {mounted ? dateString : "Memuat..."}
            </span>
            {hijriString && (
              <>
                <span className="text-slate-300">•</span>
                <span
                  suppressHydrationWarning
                  className="font-semibold text-[#466553]"
                >
                  {mounted ? `${hijriString} H` : ""}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Next Prayer Spotlight Card */}
        <div className="mt-8 w-full max-w-xl rounded-2xl border border-[#d2dfd6] bg-[#f8faf9] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="inline-block rounded-md bg-[#e7efe9] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#395243] border border-[#d2dfd6]">
                Shalat Berikutnya
              </span>
              <div className="mt-1 flex items-baseline gap-2 justify-center sm:justify-start">
                <span className="text-2xl font-black text-slate-900 sm:text-3xl">
                  {nextPrayer.label}
                </span>
                <span className="font-arabic text-lg text-[#557a64]">
                  {PRAYER_NAMES_ARABIC[nextPrayer.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                </span>
                {nextPrayer.tomorrow && (
                  <span className="text-xs text-slate-400 font-medium">(Besok)</span>
                )}
              </div>
              <p className="font-mono text-2xl font-extrabold text-[#466553] sm:text-3xl">
                {nextPrayer.time} <span className="text-xs font-normal text-slate-500">WIB</span>
              </p>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-white border border-[#d2dfd6] px-5 py-3 shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Menuju Adzan
              </span>
              <span
                suppressHydrationWarning
                className="font-mono text-3xl font-black text-[#395243] sm:text-4xl"
              >
                {mounted ? countdownText : "--:--"}
              </span>
              <span className="text-[10px] font-semibold text-[#557a64]">Hitung Mundur</span>
            </div>
          </div>
        </div>

        {/* 7 Daily Prayer Times Horizontal Grid */}
        <div className="mt-8 w-full">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
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
                  className={`group relative flex flex-col items-center justify-center rounded-xl p-3.5 transition-all duration-200 ${
                    isNext
                      ? "border border-[#395243] bg-[#466553] text-white shadow-md ring-2 ring-[#466553]/20 scale-105"
                      : "border border-slate-200/80 bg-white hover:border-[#b0c7b7] hover:bg-[#fbfdfc] shadow-sm text-slate-800"
                  }`}
                >
                  {isNext && (
                    <span className="absolute -top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase text-[#395243] shadow">
                      Aktif
                    </span>
                  )}
                  <span className={`font-arabic text-xs ${isNext ? "text-[#d2dfd6]" : "text-slate-400"}`}>
                    {arabic}
                  </span>
                  <span className={`mt-0.5 text-xs font-semibold ${isNext ? "text-white" : "text-slate-600"}`}>
                    {label}
                  </span>
                  <span
                    className={`mt-1 font-mono text-lg font-bold sm:text-xl ${
                      isNext ? "text-white" : "text-slate-900"
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
            className="flex items-center gap-2 rounded-xl bg-[#557a64] hover:bg-[#466553] px-5 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition-all"
          >
            <span>Jadwal Shalat 7 Hari</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/tv"
            target="_blank"
            className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white hover:bg-[#fbfdfc] hover:border-[#b0c7b7] px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm active:scale-95 transition-all"
          >
            <Tv className="h-4 w-4 text-[#557a64]" />
            <span>Buka TV Display Masjid</span>
          </Link>

          <Link
            href="/adzan-iqamah"
            className="flex items-center gap-2 rounded-xl border border-[#d2dfd6] bg-[#f4f7f5] hover:bg-[#e7efe9] px-5 py-2.5 text-xs font-semibold text-[#395243] shadow-sm active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4 text-[#557a64]" />
            <span>Hitung Mundur Iqamah</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
