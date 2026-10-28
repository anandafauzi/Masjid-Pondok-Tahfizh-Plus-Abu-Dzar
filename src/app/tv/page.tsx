"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TvData } from "@/lib/public-data";
import { PRAYER_NAMES_ARABIC } from "@/utils/constants";
import {
  Clock,
  Sparkles,
  WifiOff,
  BookOpen,
  Users,
} from "lucide-react";

function clockString(ms: number) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(ms));
}

function dateString(ms: number) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(ms));
}

function hijriString(ms: number) {
  try {
    return new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

function countdown(targetMs: number, nowMs: number) {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const SLIDE_COUNT = 5;

const SLIDE_TITLES = [
  "Jadwal Shalat Hari Ini",
  "Jadwal Adzan & Iqamah",
  "Petugas Shalat Berjamaah",
  "Khutbah Jumat & Kajian",
  "Mutiara Nasihat Islami",
];

const PRAYER_LIST = [
  { key: "imsak", label: "Imsak", ar: "الإمساك" },
  { key: "fajr", label: "Subuh", ar: "الفجر" },
  { key: "sunrise", label: "Terbit", ar: "الشروق" },
  { key: "dhuhr", label: "Zuhur", ar: "الظهر" },
  { key: "asr", label: "Asar", ar: "العصر" },
  { key: "maghrib", label: "Magrib", ar: "المغرب" },
  { key: "isha", label: "Isya", ar: "العشاء" },
] as const;

export default function TVDisplayPage() {
  const [data, setData] = useState<TvData | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [slide, setSlide] = useState(0);
  const [adviceIndex, setAdviceIndex] = useState(0);
  const [connected, setConnected] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/public/tv-data", { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const d = (await res.json()) as TvData;
      setData(d);
      setOffset(new Date(d.serverTime).getTime() - Date.now());
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 20000);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  const serverNow = now + offset;

  const khutbahVisible = useMemo(() => {
    if (!data?.khutbah) return false;
    return new Date(data.khutbah.endsAt).getTime() > serverNow;
  }, [data, serverNow]);

  const interval = (data?.display.slideIntervalSeconds ?? 12) * 1000;

  const hasImamToday = Boolean(data && data.imamToday.length > 0);
  const hasFridayContent = Boolean(
    data && (data.jumat.khatibName || data.kajian.length > 0)
  );
  const hasAdvice = Boolean(data && data.advice.length > 0);

  const availableSlides = useMemo(() => {
    const slides = [0, 1];
    if (hasImamToday) slides.push(2);
    if (hasFridayContent) slides.push(3);
    if (hasAdvice) slides.push(4);
    return slides;
  }, [hasImamToday, hasFridayContent, hasAdvice]);

  useEffect(() => {
    if (availableSlides.length === 0) return;
    if (!availableSlides.includes(slide)) setSlide(availableSlides[0]);
  }, [availableSlides, slide]);

  useEffect(() => {
    if (!data?.display.autoRotateEnabled || khutbahVisible) return;
    const timer = setInterval(() => {
      setSlide((current) => {
        for (let i = 1; i <= SLIDE_COUNT; i++) {
          const candidate = (current + i) % SLIDE_COUNT;
          if (availableSlides.includes(candidate)) return candidate;
        }
        return current;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [data?.display.autoRotateEnabled, interval, khutbahVisible, availableSlides]);

  useEffect(() => {
    if (!data || data.advice.length <= 1) return;
    const timer = setInterval(() => {
      setAdviceIndex((i) => (i + 1) % data.advice.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [data]);

  const iqamahActive = useMemo(() => {
    const next = data?.nextIqamah;
    if (!next) return null;
    const adhan = new Date(next.adhanTarget).getTime();
    const iqamah = new Date(next.iqamahTarget).getTime();
    if (adhan <= serverNow && iqamah > serverNow) return next;
    return null;
  }, [data, serverNow]);

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-white bg-islamic-pattern">
        <div className="relative text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-500/10 text-6xl ring-2 ring-emerald-500/30 animate-pulse">
            🕌
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Sistem Informasi Layar TV Masjid
          </h2>
          <p className="mt-2 text-base text-emerald-400 font-mono">
            Menghubungkan &amp; Mengambil Data...
          </p>
        </div>
      </div>
    );
  }

  const tickerText = data.runningTexts.map((r) => r.content).join("     ✦     ");
  const tickerContent =
    tickerText ||
    "Selamat Datang di Masjid Pondok Tahfizh Plus Abu Dzar - Rumpin, Kabupaten Bogor";
  const tickerSpeed = Math.max(10, data.display.tickerSpeed || 50);
  const tickerDuration = Math.max(
    16,
    Math.round((tickerContent.length / 4) * (50 / tickerSpeed))
  );

  // KHUTBAH JUMAT FULLSCREEN MODE
  if (khutbahVisible && data.khutbah) {
    return (
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 text-white bg-islamic-pattern">
        <div className="pointer-events-none absolute inset-0 bg-radial-gradient from-emerald-500/10 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-10">
          {/* Mosque Header */}
          <div className="mb-4 flex max-w-full items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold tracking-widest text-emerald-300 uppercase sm:mb-6 sm:gap-3 sm:px-6 sm:text-lg">
            <span>🕌</span>
            <span className="truncate">{data.mosque.name}</span>
          </div>

          <div className="mb-3 font-arabic text-3xl text-amber-300 drop-shadow sm:mb-4 sm:text-4xl">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>

          <div className="my-4 w-full max-w-4xl rounded-3xl border border-amber-500/30 bg-black/40 p-5 backdrop-blur-2xl shadow-2xl sm:my-6 sm:p-10">
            <span className="mb-3 inline-block rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold tracking-widest text-amber-300 border border-amber-500/30 uppercase sm:mb-6 sm:px-4 sm:text-sm">
              Shalat Jumat
            </span>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-7xl">
              KHUTBAH JUMAT
            </h1>
            <p className="mt-2 text-xl font-semibold text-emerald-400 sm:mt-3 sm:text-2xl md:text-3xl">
              Sedang Berlangsung
            </p>

            <div className="mx-auto my-4 h-px w-32 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent sm:my-8 sm:w-48" />

            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:text-sm">
                  Khatib
                </p>
                <p className="mt-1 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                  {data.khutbah.khatibName}
                </p>
              </div>

              {data.khutbah.sermonTopic && (
                <div className="pt-1 sm:pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 sm:text-sm">
                    Tema Khutbah
                  </p>
                  <p className="mt-1 text-xl font-semibold text-amber-200 sm:text-2xl md:text-3xl">
                    “{data.khutbah.sermonTopic}”
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/10 sm:mt-4 sm:px-8 sm:py-3 sm:text-lg">
            Mari dengarkan khutbah dengan khusyuk dan tidak berbicara.
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-1 border-t border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-400 sm:flex-row sm:px-8 sm:py-4 sm:text-base">
          <span>{dateString(serverNow)}</span>
          <span className="font-mono text-lg font-bold text-emerald-400 sm:text-xl">
            {clockString(serverNow)} WIB
          </span>
        </footer>
      </div>
    );
  }

  // STANDARD TV DISPLAY MODE
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-950 text-white bg-islamic-pattern select-none">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px]" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 lg:py-4">
        {/* Left: Mosque branding */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-2xl shadow-lg ring-2 ring-emerald-400/30 sm:h-14 sm:w-14 sm:text-3xl">
            🕌
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-black tracking-tight text-white sm:text-2xl md:text-3xl">
                {data.mosque.name}
              </h1>
            </div>
            <p className="hidden truncate text-xs text-slate-300 sm:block md:text-sm">
              {data.mosque.address ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}
            </p>
          </div>
        </div>

        {/* Center: Slide indicator tabs */}
        <div className="hidden lg:flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 ring-1 ring-white/10">
          {availableSlides.map((s) => (
            <button
              key={s}
              onClick={() => setSlide(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                slide === s
                  ? "bg-emerald-500 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {SLIDE_TITLES[s]}
            </button>
          ))}
        </div>

        {/* Right: Real-time clock & dual calendar */}
        <div className="flex shrink-0 items-center gap-2 text-right sm:gap-6">
          <div className="hidden sm:block">
            {data.display.showHijriDate && (
              <div className="flex items-center justify-end gap-2 text-xs font-semibold text-amber-300 sm:text-sm">
                <span>🌙</span>
                <span>{hijriString(serverNow)} H</span>
              </div>
            )}
            <div className="text-xs text-slate-300 font-medium">
              {dateString(serverNow)}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 backdrop-blur ring-1 ring-emerald-400/20 sm:px-5 sm:py-2">
            <div
              suppressHydrationWarning
              className="font-mono text-xl font-black tracking-tight text-emerald-300 sm:text-3xl md:text-4xl"
            >
              {clockString(serverNow)}
            </div>
            <div className="hidden text-center text-[10px] font-bold uppercase tracking-widest text-emerald-400 sm:block">
              WAKTU INDONESIA BARAT
            </div>
          </div>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 lg:overflow-hidden">
        {/* IQAMAH OVERLAY COUNTDOWN (When between Adzan and Iqamah) */}
        {iqamahActive && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/98 p-4 text-center animate-fade-in backdrop-blur-2xl sm:p-8">
            <div className="mb-3 rounded-full bg-amber-500/20 px-4 py-1.5 text-sm font-bold tracking-widest text-amber-300 border border-amber-500/30 uppercase animate-pulse sm:mb-4 sm:px-6 sm:py-2 sm:text-lg">
              MENUJU IQAMAH
            </div>
            <div className="mb-2 font-arabic text-3xl text-amber-400 sm:text-4xl">
              حَيَّ عَلَى الصَّلَاةِ
            </div>
            <h2 className="text-5xl font-black text-white md:text-8xl tracking-tight sm:text-6xl">
              {iqamahActive.label}
            </h2>
            <p className="mt-2 text-lg text-slate-300 font-medium sm:mt-4 sm:text-2xl md:text-3xl">
              Adzan {iqamahActive.adhanTime} • Iqamah {iqamahActive.iqamahTime}
            </p>

            <div className="my-4 rounded-3xl border border-amber-500/40 bg-black/60 px-5 py-4 shadow-2xl ring-2 ring-amber-400/30 sm:my-8 sm:px-12 sm:py-6">
              <span className="mb-2 block text-[10px] uppercase tracking-widest text-slate-400 sm:text-xs">
                Sisa Waktu Menuju Iqamah
              </span>
              <span className="font-mono text-6xl font-black text-amber-400 md:text-9xl sm:text-8xl tracking-tight">
                {countdown(
                  new Date(iqamahActive.iqamahTarget).getTime(),
                  serverNow
                )}
              </span>
            </div>

            <div className="max-w-2xl rounded-2xl bg-emerald-950/60 border border-emerald-500/30 px-4 py-3 text-base font-semibold text-emerald-300 sm:px-8 sm:py-4 sm:text-xl">
              Harap merapatkan &amp; meluruskan shaf, serta menonaktifkan nada dering handphone.
            </div>
          </div>
        )}

        {/* SLIDE 0: MASTER PRAYER TIMES + SPOTLIGHT CARD */}
        {slide === 0 && (
          <div className="grid min-h-full gap-3 sm:gap-6 lg:grid-cols-12 lg:gap-8 animate-fade-in">
            {/* Left Column: 7 Prayers Master Cards */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-2xl shadow-2xl sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/10 pb-3 sm:mb-4 sm:pb-4">
                <div className="flex items-center gap-2 text-base font-bold text-white sm:text-xl">
                  <Clock className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
                  <span>Jadwal Shalat Hari Ini</span>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30 sm:px-3 sm:py-1 sm:text-xs">
                  Metode {data.mosque.calculationMethod}
                </span>
              </div>

              <div className="space-y-1 sm:space-y-2.5 flex-1 flex flex-col justify-around">
                {PRAYER_LIST.map(({ key, label, ar }) => {
                  const isNext =
                    !data.nextPrayer.tomorrow && key === data.nextPrayer.key;
                  const time = data.prayerTimes[key];

                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-1.5 transition-all sm:px-6 sm:py-3 ${
                        isNext
                          ? "border border-emerald-400 bg-gradient-to-r from-emerald-950/90 to-slate-900/90 shadow-xl shadow-emerald-950/80 ring-2 ring-emerald-400/40 scale-[1.02]"
                          : "border border-white/5 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                        <span className="w-10 shrink-0 font-arabic text-base text-amber-300/80 sm:w-16 sm:text-lg">
                          {ar}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-white sm:text-xl md:text-2xl">
                            {label}
                          </span>
                          {isNext && (
                            <span className="ml-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[8px] font-bold uppercase text-white shadow sm:ml-3 sm:px-2.5 sm:text-[10px]">
                              Berikutnya
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 font-mono text-xl font-black text-white sm:text-3xl md:text-4xl">
                        <span className={isNext ? "text-emerald-300" : "text-white"}>
                          {time}
                        </span>
                        <span className="ml-1 text-[10px] font-normal text-slate-400 sm:ml-2 sm:text-xs">
                          WIB
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Next Prayer Spotlight + Imam Info */}
            <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-6">
              {/* Next Prayer Glowing Card */}
              <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/80 via-slate-900/90 to-emerald-950/80 p-4 backdrop-blur-2xl shadow-2xl ring-1 ring-emerald-400/30 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30 sm:px-3.5 sm:text-xs">
                    Waktu Shalat Berikutnya
                  </span>
                  {data.nextPrayer.tomorrow && (
                    <span className="inline-block rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/30 sm:px-3 sm:text-xs">
                      Besok
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-2 sm:mt-3">
                  <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                    {data.nextPrayer.label}
                  </h2>
                  <span className="font-arabic text-2xl text-amber-300 sm:text-3xl">
                    {PRAYER_NAMES_ARABIC[data.nextPrayer.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                  </span>
                </div>

                <div className="mt-2 font-mono text-4xl font-black text-emerald-300 sm:mt-3 sm:text-6xl md:text-7xl">
                  {data.nextPrayer.time}
                  <span className="ml-1 text-xs font-normal text-slate-300 sm:ml-2 sm:text-sm">WIB</span>
                </div>

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/40 p-3 sm:mt-6 sm:p-5">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-slate-400 sm:text-xs">
                    Hitung Mundur Adzan
                  </span>
                  <div className="font-mono text-3xl font-black text-amber-400 sm:text-4xl md:text-5xl">
                    {countdown(
                      new Date(data.nextPrayer.target).getTime(),
                      serverNow
                    )}
                  </div>
                </div>
              </div>

              {/* Imam & Muadzin Today Snippet */}
              <div className="flex-1 rounded-3xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-2xl shadow-xl flex flex-col justify-between sm:p-6">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 sm:pb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-white sm:text-base">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span>Petugas Shalat Hari Ini</span>
                  </div>
                  <span className="hidden text-xs text-slate-400 sm:inline">Imam &amp; Muadzin</span>
                </div>

                {data.imamToday.length === 0 ? (
                  <div className="my-auto text-center py-4 sm:py-6">
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Jadwal petugas shalat harian tertera di papan informasi.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
                    {data.imamToday.slice(0, 4).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
                      >
                        <span className="w-14 shrink-0 font-bold text-amber-300 sm:w-20">
                          {s.prayerName}
                        </span>
                        <div className="min-w-0 text-right">
                          <span className="block truncate font-semibold text-white sm:inline">
                            {s.imamName}
                          </span>
                          <span className="ml-1 text-[10px] text-slate-400 sm:ml-2 sm:text-xs">
                            ({s.muadzinName})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1: PRAYER & IQAMAH MATRIX */}
        {slide === 1 && (
          <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-2xl shadow-2xl animate-fade-in sm:p-8 lg:p-10">
            <div className="mb-4 text-center sm:mb-8">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/30 sm:px-4 sm:text-xs">
                Waktu &amp; Estimasi Iqamah
              </span>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-5xl">
                Jadwal Shalat &amp; Iqamah
              </h2>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Waktu hitung mundur iqamah dimulai otomatis begitu adzan selesai
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-xs font-bold text-slate-300 sm:text-base">
                    <th className="px-3 py-2 sm:px-8 sm:py-4">Waktu Shalat</th>
                    <th className="px-3 py-2 text-center sm:px-8 sm:py-4">Waktu Adzan</th>
                    <th className="px-3 py-2 text-center sm:px-8 sm:py-4">Estimasi Iqamah</th>
                    <th className="px-3 py-2 text-right sm:px-8 sm:py-4">Jeda Tunggu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.iqamahEvents.map((e) => (
                    <tr
                      key={e.key}
                      className="text-base font-semibold transition-colors hover:bg-white/5 sm:text-2xl"
                    >
                      <td className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-8 sm:py-4">
                        <span className="font-arabic text-base text-amber-300/80 sm:text-xl">
                          {PRAYER_NAMES_ARABIC[e.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                        </span>
                        <span className="text-white font-bold">{e.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-white sm:px-8 sm:py-4">
                        {e.adhanTime}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-black text-amber-400 sm:px-8 sm:py-4">
                        {e.iqamahTime}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-slate-400 sm:px-8 sm:py-4 sm:text-sm">
                        {e.mode === "FIXED_TIME" ? "Waktu Tetap" : "Jeda Sesuai Jadwal"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SLIDE 2: IMAM & MUADZIN ROSTER */}
        {slide === 2 && (
          <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-2xl shadow-2xl animate-fade-in sm:p-8 lg:p-10">
            <div className="mb-4 text-center sm:mb-8">
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300 border border-blue-500/30 sm:px-4 sm:text-xs">
                Petugas Shalat Berjamaah
              </span>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl md:text-5xl">
                Jadwal Imam &amp; Muadzin Hari Ini
              </h2>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Pondok Tahfizh Plus Abu Dzar • Rumpin, Bogor
              </p>
            </div>

            <div className="grid gap-2 sm:gap-4">
              {data.imamToday.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4"
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-sm font-bold text-amber-300 sm:h-12 sm:w-12 sm:text-lg">
                      {s.prayerName.slice(0, 3)}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white sm:text-2xl">{s.prayerName}</p>
                      <p className="text-[10px] text-slate-400 sm:text-xs">Shalat Fardhu Berjamaah</p>
                    </div>
                  </div>

                  <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:items-center sm:gap-10">
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-bold text-emerald-400 sm:text-xs">Imam</p>
                      <p className="truncate text-sm font-bold text-white sm:text-xl">{s.imamName}</p>
                    </div>
                    <div className="text-right sm:border-l sm:border-white/10 sm:pl-10">
                      <p className="text-[9px] uppercase font-bold text-blue-400 sm:text-xs">Muadzin</p>
                      <p className="truncate text-sm font-bold text-white sm:text-xl">{s.muadzinName}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 3: FRIDAY KHUTBAH & KAJIAN */}
        {slide === 3 && (
          <div className="grid min-h-full gap-3 sm:gap-6 lg:grid-cols-2 lg:gap-8 animate-fade-in">
            {/* Left: Friday Khatib */}
            <div className="flex flex-col justify-between rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-900/80 p-4 backdrop-blur-2xl shadow-2xl sm:p-8">
              <div>
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30 sm:px-4 sm:text-xs">
                  Jadwal Jumat Mendatang
                </span>
                <p className="mt-2 text-xs font-semibold text-slate-400 sm:mt-3 sm:text-sm">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "full",
                    timeZone: "Asia/Jakarta",
                  }).format(
                    new Date(data.jumat.fridayDate + "T00:00:00+07:00")
                  )}
                </p>

                <div className="mt-3 sm:mt-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 sm:text-xs">
                    Khatib Jumat
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-white sm:text-3xl md:text-4xl">
                    {data.jumat.khatibName ?? "Ust. Dr. Hasan Basri, Lc., M.A."}
                  </h3>
                </div>

                {data.jumat.sermonTopic && (
                  <div className="mt-3 rounded-2xl bg-black/40 p-3 border border-white/10 sm:mt-6 sm:p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                      Tema Khutbah
                    </p>
                    <p className="mt-1 text-base font-semibold text-amber-200 sm:text-xl">
                      “{data.jumat.sermonTopic}”
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-3 text-xs sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:pt-4 sm:text-base">
                <span className="text-slate-400">Imam Subuh Jumat:</span>
                <span className="font-bold text-emerald-300">
                  {data.jumat.imamSubuh ?? "Ust. Ahmad Fauzi"}
                </span>
              </div>
            </div>

            {/* Right: Upcoming Kajian */}
            <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-2xl shadow-2xl sm:p-8">
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 sm:pb-4">
                  <div className="flex items-center gap-2 text-base font-bold text-white sm:text-xl">
                    <BookOpen className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
                    <span>Kajian &amp; Majelis Taklim</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 sm:px-3 sm:text-xs">
                    Terbuka
                  </span>
                </div>

                {data.kajian.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 sm:py-12">
                    <p className="text-sm font-medium sm:text-lg">
                      Kajian rutin tafsir dan tahsin diselenggarakan setiap pekan.
                    </p>
                    <p className="mt-2 text-[10px] text-slate-500 sm:text-xs">
                      Ikuti pengumuman takmir untuk jadwal kajian tematik terbaru.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 sm:mt-6 sm:space-y-4">
                    {data.kajian.slice(0, 3).map((k) => (
                      <div
                        key={k.id}
                        className="rounded-2xl border border-white/5 bg-white/5 p-3 sm:p-4"
                      >
                        <h4 className="text-sm font-bold text-white sm:text-lg">{k.title}</h4>
                        <p className="mt-0.5 text-xs font-semibold text-emerald-400 sm:text-sm">
                          {k.speakerName}
                        </p>
                        <p className="mt-1.5 text-[10px] text-slate-400 sm:mt-2 sm:text-xs">
                          {new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Jakarta",
                          }).format(new Date(k.startDateTime))}{" "}
                          • {k.location}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 text-center text-[10px] text-slate-500 sm:mt-6 sm:text-xs">
                Informasi lebih lanjut dapat menghubungi Pengurus Takmir Masjid
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: ISLAMIC ADVICE & HADITH */}
        {slide === 4 && (
          <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center backdrop-blur-2xl shadow-2xl animate-fade-in sm:p-8 lg:p-12">
            <span className="mb-3 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/30 sm:mb-6 sm:px-4 sm:text-xs">
              Mutiara Nasihat &amp; Hikmah
            </span>

            {data.advice.length === 0 ? (
              <div>
                <p className="font-arabic text-2xl text-amber-300 leading-relaxed sm:text-4xl">
                  إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ
                </p>
                <p className="mt-3 text-lg font-semibold text-white leading-relaxed sm:mt-6 sm:text-2xl">
                  “Sesungguhnya shalat itu mencegah dari perbuatan-perbuatan keji dan mungkar.”
                </p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-emerald-400 sm:mt-4 sm:text-sm">
                  QS. Al-Ankabut: 45
                </p>
              </div>
            ) : (
              <div key={adviceIndex} className="animate-fade-in space-y-3 sm:space-y-6">
                <p className="text-xl font-semibold leading-relaxed text-white sm:text-3xl md:text-4xl">
                  “{data.advice[adviceIndex % data.advice.length].content}”
                </p>
                <p className="text-sm font-bold text-amber-300 sm:text-lg">
                  {data.advice[adviceIndex % data.advice.length].sourceReference ||
                    data.advice[adviceIndex % data.advice.length].authorOrSource ||
                    "Hadits Shahih"}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Running Text Ticker */}
      {data.display.tickerEnabled && (
        <footer className="relative z-10 overflow-hidden border-t border-white/10 bg-slate-950/90 py-2 backdrop-blur sm:py-3">
          <div className="flex items-center">
            <div className="z-10 flex shrink-0 items-center gap-2 bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-md sm:px-4 sm:text-xs">
              <Sparkles className="h-3 w-3 text-amber-300 sm:h-3.5 sm:w-3.5" />
              <span>INFO MASJID</span>
            </div>
            <div className="overflow-hidden whitespace-nowrap text-sm text-slate-200 sm:text-base">
              <span
                className="inline-block animate-marquee"
                style={{ animationDuration: `${tickerDuration}s` }}
              >
                {tickerContent}
              </span>
            </div>
          </div>
        </footer>
      )}

      {/* Offline Status Warning Indicator */}
      {!connected && (
        <div className="fixed bottom-16 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-xl bg-red-600/90 px-3 py-2 text-[10px] font-bold text-white shadow-2xl backdrop-blur sm:bottom-14 sm:right-6 sm:px-4 sm:py-2.5 sm:text-xs">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Koneksi Offline — Menampilkan Data Tersimpan</span>
        </div>
      )}
    </div>
  );
}
