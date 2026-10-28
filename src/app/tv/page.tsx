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
  const [postIqamahKey, setPostIqamahKey] = useState<string | null>(null);
  const [postIqamahUntil, setPostIqamahUntil] = useState<number | null>(null);

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
    if (slide !== 4) return;
    const timer = setInterval(() => {
      setAdviceIndex((i) => (i + 1) % data.advice.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [data, slide]);

  const iqamahActive = useMemo(() => {
    const next = data?.nextIqamah;
    if (!next) return null;
    const adhan = new Date(next.adhanTarget).getTime();
    const iqamah = new Date(next.iqamahTarget).getTime();
    if (adhan <= serverNow && iqamah > serverNow) return next;
    return null;
  }, [data, serverNow]);

  const prayerTimeReached = useMemo((): { event: NonNullable<TvData["iqamahEvents"]>[number] } | null => {
    if (!data?.nextPrayer) return null;
    const target = new Date(data.nextPrayer.target).getTime();
    if (target <= serverNow && !iqamahActive) {
      const ev = data.iqamahEvents?.find((e) => e.key === data.nextPrayer.key);
      if (ev) {
        const iq = new Date(ev.iqamahTarget).getTime();
        if (iq > serverNow) return { event: ev };
      }
    }
    return null;
  }, [data, serverNow, iqamahActive]);

  if (!data) {
    return (
      <div suppressHydrationWarning className="flex min-h-dvh items-center justify-center bg-[#faf7f2] text-[#19261f] bg-islamic-pattern">
        <div className="relative text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#2d946e]/10 text-6xl ring-2 ring-[#2d946e]/30 animate-pulse">
            🕌
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#19261f] md:text-3xl">
            Sistem Informasi Layar TV Masjid
          </h2>
          <p className="mt-2 text-base text-[#2d946e] font-semibold font-mono">
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
      <div suppressHydrationWarning className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-br from-[#faf7f2] via-[#eaf6f0] to-[#faf7f2] text-[#19261f] bg-islamic-pattern">
        <div className="pointer-events-none absolute inset-0 bg-radial-gradient from-[#3eb489]/15 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-10">
          {/* Mosque Header */}
          <div className="mb-4 flex max-w-full items-center gap-2 rounded-full border border-[#2d946e]/30 bg-[#2d946e]/10 px-4 py-2 text-sm font-bold tracking-widest text-[#1e6149] uppercase sm:mb-6 sm:gap-3 sm:px-6 sm:text-lg">
            <span>🕌</span>
            <span className="truncate">{data.mosque.name}</span>
          </div>

          <div className="mb-3 font-arabic text-3xl font-bold text-[#8a6820] sm:mb-4 sm:text-4xl">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>

          <div className="my-4 w-full max-w-4xl rounded-3xl border border-[#ded5c4] bg-[#fdfbf7] p-5 shadow-2xl sm:my-6 sm:p-10">
            <span className="mb-3 inline-block rounded-full bg-[#faf4e6] px-3 py-1 text-xs font-bold tracking-widest text-[#7c6630] border border-[#ecd8a6] uppercase sm:mb-6 sm:px-4 sm:text-sm">
              Shalat Jumat
            </span>
            <h1 className="text-4xl font-black tracking-tight text-[#19261f] sm:text-5xl md:text-7xl">
              KHUTBAH JUMAT
            </h1>
            <p className="mt-2 text-xl font-bold text-[#2d946e] sm:mt-3 sm:text-2xl md:text-3xl">
              Sedang Berlangsung
            </p>

            <div className="mx-auto my-4 h-px w-32 bg-gradient-to-r from-transparent via-[#8a6820]/40 to-transparent sm:my-8 sm:w-48" />

            <div className="space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5c6e63] sm:text-sm">
                  Khatib
                </p>
                <p className="mt-1 text-2xl font-bold text-[#19261f] sm:text-3xl md:text-4xl">
                  {data.khutbah.khatibName}
                </p>
              </div>

              {data.khutbah.sermonTopic && data.khutbah.sermonTopic.trim() !== "" && (
                <div className="pt-1 sm:pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5c6e63] sm:text-sm">
                    Tema Khutbah
                  </p>
                  <p className="mt-1 text-xl font-bold text-[#8a6820] sm:text-2xl md:text-3xl">
                    “{data.khutbah.sermonTopic}”
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white border border-[#ded5c4] px-4 py-2 text-sm font-semibold text-[#5c6e63] shadow-sm sm:mt-4 sm:px-8 sm:py-3 sm:text-lg">
            Mari dengarkan khutbah dengan khusyuk dan tidak berbicara.
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-1 border-t border-[#ded5c4] bg-[#fbf9f4]/95 px-4 py-3 text-sm text-[#5a685e] sm:flex-row sm:px-8 sm:py-4 sm:text-base">
          <span suppressHydrationWarning>{dateString(serverNow)}</span>
          <span suppressHydrationWarning className="font-mono text-lg font-bold text-[#1e6149] sm:text-xl">
            {clockString(serverNow)} WIB
          </span>
        </footer>
      </div>
    );
  }

  // STANDARD TV DISPLAY MODE
  return (
    <div suppressHydrationWarning className="relative flex min-h-dvh flex-col overflow-hidden bg-[#faf7f2] text-[#19261f] bg-islamic-pattern select-none">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#3eb489]/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#c5a059]/10 blur-[120px]" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between gap-2 border-b border-[#ded5c4] bg-[#fbf9f4]/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 lg:py-4">
        {/* Left: Mosque branding */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#3eb489] to-[#205e48] shadow-lg ring-2 ring-[#8fd2b5]/30 sm:h-14 sm:w-14">
            {data.mosque.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.mosque.logoUrl} alt={data.mosque.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-2xl sm:text-3xl">🕌</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-black tracking-tight text-[#19261f] sm:text-2xl md:text-3xl">
                {data.mosque.name}
              </h1>
            </div>
            <p className="hidden truncate text-xs text-[#5a685e] sm:block md:text-sm">
              {data.mosque.address ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}
            </p>
          </div>
        </div>

        {/* Right: Real-time clock & dual calendar */}
        <div className="flex shrink-0 items-center gap-2 text-right sm:gap-6">
          <div className="hidden sm:block">
            {data.display.showHijriDate && (
              <div suppressHydrationWarning className="flex items-center justify-end gap-2 text-xs font-semibold text-[#8a6820] sm:text-sm">
                <span>🌙</span>
                <span>{hijriString(serverNow)} H</span>
              </div>
            )}
            <div suppressHydrationWarning className="text-xs text-[#5a685e] font-medium">
              {dateString(serverNow)}
            </div>
          </div>

          <div className="rounded-2xl border border-[#3eb489]/40 bg-[#eaf6f0] px-3 py-1.5 backdrop-blur ring-1 ring-[#bde5d2] sm:px-5 sm:py-2">
            <div
              suppressHydrationWarning
              className="font-mono text-xl font-black tracking-tight text-[#1e6149] sm:text-3xl md:text-4xl"
            >
              {clockString(serverNow)}
            </div>
            <div className="hidden text-center text-[10px] font-bold uppercase tracking-widest text-[#257659] sm:block">
              WAKTU INDONESIA BARAT
            </div>
          </div>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main className="relative z-10 min-h-0 flex-1 overflow-hidden p-3 sm:p-6 md:p-8">
        {/* IQAMAH OVERLAY COUNTDOWN (When between Adzan and Iqamah) */}
        {(() => {
          const activeEv = iqamahActive ?? prayerTimeReached?.event;
          if (!activeEv) return null;
          const iqTarget = new Date(activeEv.iqamahTarget).getTime();
          const activeKey = ("key" in activeEv ? activeEv.key : "") || activeEv.label;
          const key = `${activeKey}-${iqTarget}`;
          if (iqTarget <= serverNow) {
            if (postIqamahKey !== key || postIqamahUntil === null) {
              setTimeout(() => {
                setPostIqamahKey(key);
                setPostIqamahUntil(iqTarget + 10000);
              }, 0);
            }
            if (postIqamahKey === key && postIqamahUntil && serverNow < postIqamahUntil) {
              return (
                <div suppressHydrationWarning className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#11231a]/98 p-4 text-center animate-fade-in backdrop-blur-2xl">
                  <h2 className="text-4xl font-black text-white sm:text-6xl md:text-8xl leading-tight">
                    Lurus dan rapatkan shaf untuk kesempurnaan shalat
                  </h2>
                </div>
              );
            }
            if (postIqamahKey === key && postIqamahUntil && serverNow >= postIqamahUntil) {
              setTimeout(() => {
                setPostIqamahKey(null);
                setPostIqamahUntil(null);
              }, 0);
            }
            return null;
          }
          if (postIqamahKey === key) {
            setTimeout(() => {
              setPostIqamahKey(null);
              setPostIqamahUntil(null);
            }, 0);
          }
          return (
            <div suppressHydrationWarning className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#11231a]/98 p-4 text-center animate-fade-in backdrop-blur-2xl sm:p-8">
              <div className="mb-3 rounded-full bg-[#c5a059]/20 px-4 py-1.5 text-sm font-bold tracking-widest text-[#eddcb2] border border-[#c5a059]/30 uppercase animate-pulse sm:mb-4 sm:px-6 sm:py-2 sm:text-lg">
                MENUJU IQAMAH
              </div>
              <div className="mb-2 font-arabic text-3xl text-[#eddcb2] sm:text-4xl">
                حَيَّ عَلَى الصَّلَاةِ
              </div>
              <h2 className="text-5xl font-black text-white md:text-8xl tracking-tight sm:text-6xl">
                {activeEv.label}
              </h2>
              <p className="mt-2 text-lg text-[#b8ccc0] font-medium sm:mt-4 sm:text-2xl md:text-3xl">
                Adzan {activeEv.adhanTime} • Waktu Iqamah {activeEv.iqamahTime}
              </p>

              <div className="my-4 rounded-3xl border border-[#c5a059]/40 bg-[#0a1811]/70 px-5 py-4 shadow-2xl ring-2 ring-[#c5a059]/30 sm:my-8 sm:px-12 sm:py-6">
                <span className="mb-2 block text-[10px] uppercase tracking-widest text-[#9db3a6] sm:text-xs">
                  Sisa Waktu Menuju Iqamah
                </span>
                <span suppressHydrationWarning className="font-mono text-6xl font-black text-[#eddcb2] md:text-9xl sm:text-8xl tracking-tight">
                  {countdown(
                    new Date(activeEv.iqamahTarget).getTime(),
                    serverNow
                  )}
                </span>
              </div>

              <div className="max-w-2xl rounded-2xl bg-[#1e6149]/50 border border-[#3eb489]/30 px-4 py-3 text-base font-semibold text-[#a5e4cb] sm:px-8 sm:py-4 sm:text-xl">
                Harap merapatkan &amp; meluruskan shaf, serta menonaktifkan nada dering handphone.
              </div>
            </div>
          );
        })()}

        {/* SLIDE 0: MASTER PRAYER TIMES + SPOTLIGHT CARD */}
        {slide === 0 && (
          <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-center animate-fade-in">
            <div className="grid h-full gap-3 sm:gap-6 lg:grid-cols-12 lg:gap-8 items-stretch">
              {/* Left Column: 7 Prayers Master Cards */}
              <div className="lg:col-span-7 h-full flex flex-col justify-between rounded-3xl border border-[#ded5c4] bg-white/95 p-3 backdrop-blur-2xl shadow-xl sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#ded5c4] pb-3 sm:mb-4 sm:pb-4">
                  <div className="flex items-center gap-2 text-base font-bold text-[#19261f] sm:text-xl">
                    <Clock className="h-4 w-4 text-[#2d946e] sm:h-5 sm:w-5" />
                    <span>Jadwal Shalat Hari Ini</span>
                  </div>
                  <span className="rounded-full bg-[#eaf6f0] px-2 py-0.5 text-[10px] font-semibold text-[#1e6149] border border-[#bde5d2] sm:px-3 sm:py-1 sm:text-xs">
                    Metode {data.mosque.calculationMethod}
                  </span>
                </div>

                <div className="space-y-1 sm:space-y-2 flex-1 flex flex-col justify-between">
                  {PRAYER_LIST.map(({ key, label, ar }) => {
                    const isNext =
                      !data.nextPrayer.tomorrow && key === data.nextPrayer.key;
                    const time = data.prayerTimes[key];

                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-1.5 transition-all sm:px-6 sm:py-2.5 ${
                          isNext
                            ? "border border-[#3eb489] bg-gradient-to-r from-[#eef8f3] to-white shadow-lg ring-2 ring-[#3eb489]/30 scale-[1.01]"
                            : "border border-[#ded5c4]/60 bg-[#fbf9f4] hover:bg-white"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                          <span className="w-10 shrink-0 font-arabic text-base text-[#8a6820] sm:w-16 sm:text-lg">
                            {ar}
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-[#19261f] sm:text-xl md:text-2xl">
                              {label}
                            </span>
                            {isNext && (
                              <span className="ml-1.5 rounded-full bg-[#2d946e] px-2 py-0.5 text-[8px] font-bold uppercase text-white shadow sm:ml-3 sm:px-2.5 sm:text-[10px]">
                                Berikutnya
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 font-mono text-xl font-black text-[#19261f] sm:text-3xl md:text-4xl">
                          <span className={isNext ? "text-[#1e6149]" : "text-[#19261f]"}>
                            {time}
                          </span>
                          <span className="ml-1 text-[10px] font-normal text-[#6d7c71] sm:ml-2 sm:text-xs">
                            WIB
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Next Prayer Spotlight + Imam Info */}
              <div className="lg:col-span-5 h-full flex flex-col justify-between gap-3 sm:gap-6">
                {/* Next Prayer Glowing Card */}
                <div className="flex-1 flex flex-col justify-between rounded-3xl border border-[#bde5d2] bg-gradient-to-br from-[#eef8f3] via-[#f7fbf8] to-[#e8f6ef] p-4 text-[#19261f] backdrop-blur-2xl shadow-xl sm:p-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block rounded-full bg-[#faf4e6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7c6630] border border-[#ecd8a6] sm:px-3.5 sm:text-xs">
                        Waktu Shalat Berikutnya
                      </span>
                      {data.nextPrayer.tomorrow && (
                        <span className="inline-block rounded-full bg-[#2d946e]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1e6149] border border-[#2d946e]/30 sm:px-3 sm:text-xs">
                          Besok
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-2 sm:mt-3">
                      <h2 className="text-2xl font-black tracking-tight text-[#19261f] sm:text-4xl md:text-5xl">
                        {data.nextPrayer.label}
                      </h2>
                      <span className="font-arabic text-2xl text-[#8a6820] sm:text-3xl">
                        {PRAYER_NAMES_ARABIC[data.nextPrayer.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                      </span>
                    </div>

                    <div className="mt-2 font-mono text-4xl font-black text-[#2d946e] sm:mt-3 sm:text-6xl md:text-7xl">
                      {data.nextPrayer.time}
                      <span className="ml-1 text-xs font-semibold text-[#5c6e63] sm:ml-2 sm:text-sm">WIB</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-[#ecd8a6] bg-[#faf4e6] p-3 sm:mt-4 sm:p-4 shadow-inner">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#7c6630] sm:text-xs">
                      Hitung Mundur Adzan
                    </span>
                    <div suppressHydrationWarning className="font-mono text-3xl font-black text-[#8a6820] sm:text-4xl md:text-5xl">
                      {countdown(
                        new Date(data.nextPrayer.target).getTime(),
                        serverNow
                      )}
                    </div>
                  </div>
                </div>

                {/* Imam & Muadzin Today Snippet */}
                <div className="rounded-3xl border border-[#ded5c4] bg-white/95 p-4 shadow-xl flex flex-col justify-between sm:p-5 text-[#19261f]">
                  <div className="flex items-center justify-between gap-2 border-b border-[#ded5c4] pb-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#19261f] sm:text-base">
                      <Users className="h-4 w-4 text-[#2d946e]" />
                      <span>Petugas Shalat Hari Ini</span>
                    </div>
                    <span className="hidden text-xs text-[#5a685e] sm:inline">Imam &amp; Muadzin</span>
                  </div>

                  {data.imamToday.length === 0 ? (
                    <div className="my-auto text-center py-4">
                      <p className="text-[#5a685e] text-xs sm:text-sm">
                        Jadwal petugas shalat harian tertera di papan informasi.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5 sm:mt-2.5">
                      {data.imamToday.slice(0, 4).map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-[#fbf9f4] border border-[#ded5c4]/60 px-2.5 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm"
                        >
                          <span className="w-14 shrink-0 font-bold text-[#8a6820] sm:w-16">
                            {s.prayerName}
                          </span>
                          <div className="min-w-0 text-right">
                            <span className="block truncate font-semibold text-[#19261f] sm:inline">
                              {s.imamName}
                            </span>
                            <span className="ml-1 text-[10px] text-[#5a685e] sm:ml-2 sm:text-xs">
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
          </div>
        )}

        {/* SLIDE 1: PRAYER & IQAMAH MATRIX */}
        {slide === 1 && (
          <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-center animate-fade-in">
            <div className="w-full rounded-3xl border border-[#ded5c4] bg-white/95 p-4 sm:p-7 lg:p-8 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
              <div className="mb-3 text-center sm:mb-5">
                <span className="rounded-full bg-[#3eb489]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1e6149] border border-[#3eb489]/30 sm:px-4 sm:text-xs">
                  Waktu &amp; Iqamah
                </span>
                <h2 className="mt-1.5 text-2xl font-black text-[#19261f] sm:text-3xl md:text-4xl">
                  Jadwal Shalat &amp; Iqamah
                </h2>
                <p className="mt-1 text-xs text-[#5a685e] sm:text-sm">
                  Waktu hitung mundur iqamah dimulai otomatis saat waktu shalat tiba
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#ded5c4] bg-[#fbf9f4]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#ded5c4] bg-[#f4eee2] text-xs font-bold text-[#19261f] sm:text-base">
                      <th className="px-4 py-2.5 sm:px-8 sm:py-3.5">Waktu Shalat</th>
                      <th className="px-4 py-2.5 text-center sm:px-8 sm:py-3.5">Waktu Adzan</th>
                      <th className="px-4 py-2.5 text-center sm:px-8 sm:py-3.5">Waktu Iqamah</th>
                      <th className="px-4 py-2.5 text-right sm:px-8 sm:py-3.5">Jeda Tunggu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ded5c4] text-[#19261f]">
                    {data.iqamahEvents.map((e) => (
                      <tr
                        key={e.key}
                        className="text-base font-semibold transition-colors hover:bg-white sm:text-xl lg:text-2xl"
                      >
                        <td className="flex items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-8 sm:py-3.5">
                          <span className="font-arabic text-base text-[#8a6820] sm:text-xl">
                            {PRAYER_NAMES_ARABIC[e.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                          </span>
                          <span className="text-[#19261f] font-bold">{e.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-[#19261f] sm:px-8 sm:py-3.5">
                          {e.adhanTime}
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-black text-[#205e48] sm:px-8 sm:py-3.5">
                          {e.iqamahTime}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[10px] text-[#748479] sm:px-8 sm:py-3.5 sm:text-sm">
                          {e.mode === "FIXED_TIME" ? "Waktu Tetap" : `${e.label === "Magrib" ? "5" : "15-20"} Menit`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: IMAM & MUADZIN ROSTER */}
        {slide === 2 && (
          <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-center animate-fade-in">
            <div className="w-full rounded-3xl border border-[#ded5c4] bg-white/95 p-4 sm:p-7 lg:p-8 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
              <div className="mb-3 text-center sm:mb-5">
                <span className="rounded-full bg-[#3eb489]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1e6149] border border-[#3eb489]/30 sm:px-4 sm:text-xs">
                  Petugas Shalat Berjamaah
                </span>
                <h2 className="mt-1.5 text-2xl font-black text-[#19261f] sm:text-3xl md:text-4xl">
                  Jadwal Imam &amp; Muadzin Hari Ini
                </h2>
                <p className="mt-1 text-xs text-[#5a685e] sm:text-sm">
                  Pondok Tahfizh Plus Abu Dzar • Rumpin, Bogor
                </p>
              </div>

              <div className="grid gap-2 sm:gap-3">
                {data.imamToday.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-2 rounded-2xl border border-[#ded5c4] bg-[#fbf9f4] px-4 py-2.5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-3.5"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c5a059]/20 text-sm font-bold text-[#8a6820] sm:h-11 sm:w-11 sm:text-base">
                        {s.prayerName.slice(0, 3)}
                      </div>
                      <div>
                        <p className="text-base font-bold text-[#19261f] sm:text-xl">{s.prayerName}</p>
                        <p className="text-[10px] text-[#5a685e] sm:text-xs">Shalat Fardhu Berjamaah</p>
                      </div>
                    </div>

                    <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:items-center sm:gap-12">
                      <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-[#2d946e] sm:text-xs">Imam</p>
                        <p className="truncate text-sm font-bold text-[#19261f] sm:text-lg">{s.imamName}</p>
                      </div>
                      <div className="text-right sm:border-l sm:border-[#ded5c4] sm:pl-10">
                        <p className="text-[9px] uppercase font-bold text-[#457c6b] sm:text-xs">Muadzin</p>
                        <p className="truncate text-sm font-bold text-[#19261f] sm:text-lg">{s.muadzinName}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: FRIDAY KHUTBAH & KAJIAN */}
        {slide === 3 && (
          <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-center animate-fade-in">
            <div className="grid h-full gap-3 sm:gap-6 lg:grid-cols-2 lg:gap-8 items-stretch">
              {/* Left: Friday Khatib */}
              <div className="h-full flex flex-col justify-between rounded-3xl border border-[#ded3be] bg-gradient-to-br from-[#fdfbf7] via-[#f7f2e5] to-[#f4ebe1] p-4 backdrop-blur-2xl shadow-xl sm:p-7">
                <div>
                  <span className="rounded-full bg-[#c5a059] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm sm:px-4 sm:text-xs">
                    Jadwal Jumat Mendatang
                  </span>
                  <p className="mt-2 text-xs font-semibold text-[#5a685e] sm:mt-2.5 sm:text-sm">
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "full",
                      timeZone: "Asia/Jakarta",
                    }).format(
                      new Date(data.jumat.fridayDate + "T00:00:00+07:00")
                    )}
                  </p>

                  <div className="mt-3 sm:mt-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a6820] sm:text-xs">
                      Khatib Jumat
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-[#19261f] sm:text-3xl md:text-4xl">
                      {data.jumat.khatibName ?? "Ust. Dr. Hasan Basri, Lc., M.A."}
                    </h3>
                  </div>

                  {data.jumat.sermonTopic && data.jumat.sermonTopic.trim() !== "" && (
                    <div className="mt-3 rounded-2xl bg-white/80 p-3 border border-[#ded3be] sm:mt-5 sm:p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a6820] sm:text-xs">
                        Tema Khutbah
                      </p>
                      <p className="mt-1 text-base font-semibold text-[#19261f] sm:text-lg">
                        “{data.jumat.sermonTopic}”
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-1 border-t border-[#ded3be] pt-3 text-xs sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:pt-4 sm:text-base">
                  <span className="text-[#5a685e]">Imam Subuh Jumat:</span>
                  <span className="font-bold text-[#1e6149]">
                    {data.jumat.imamSubuh ?? "Ust. Ahmad Fauzi"}
                  </span>
                </div>
              </div>

              {/* Right: Upcoming Kajian */}
              <div className="h-full flex flex-col justify-between rounded-3xl border border-[#bde5d2] bg-gradient-to-br from-[#f8fdfb] via-[#edf7f3] to-[#e4f3ec] p-4 backdrop-blur-2xl shadow-xl sm:p-7">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-[#bde5d2] pb-3 sm:pb-3.5">
                    <div className="flex items-center gap-2 text-base font-bold text-[#19261f] sm:text-lg">
                      <BookOpen className="h-4 w-4 text-[#2d946e] sm:h-5 sm:w-5" />
                      <span>Kajian &amp; Majelis Taklim</span>
                    </div>
                    <span className="rounded-full bg-[#2d946e] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm sm:px-3 sm:text-xs">
                      Terbuka
                    </span>
                  </div>

                  {data.kajian.length === 0 ? (
                    <div className="py-6 text-center text-[#5a685e] sm:py-10">
                      <p className="text-sm font-medium sm:text-base">
                        Kajian rutin tafsir dan tahsin diselenggarakan setiap pekan.
                      </p>
                      <p className="mt-1.5 text-[10px] text-[#748479] sm:text-xs">
                        Ikuti pengumuman takmir untuk jadwal kajian tematik terbaru.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
                      {data.kajian.slice(0, 3).map((k) => (
                        <div
                          key={k.id}
                          className="rounded-2xl border border-[#bde5d2] bg-white/80 p-3 sm:p-3.5"
                        >
                          <h4 className="text-sm font-bold text-[#19261f] sm:text-base">{k.title}</h4>
                          <p className="mt-0.5 text-xs font-semibold text-[#257659]">
                            {k.speakerName}
                          </p>
                          <p className="mt-1 text-[10px] text-[#5a685e] sm:text-xs">
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

                <div className="mt-3 text-center text-[10px] text-[#5a685e] sm:mt-4 sm:text-xs">
                  Informasi lebih lanjut dapat menghubungi Pengurus Takmir Masjid
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: ISLAMIC ADVICE & HADITH */}
        {slide === 4 && (
          <div className="w-full max-w-7xl mx-auto h-full flex flex-col justify-center animate-fade-in">
            <div className="w-full rounded-3xl border border-[#ded5c4] bg-gradient-to-br from-[#fdfbf7] via-[#f7f3ea] to-[#f1eae0] p-6 sm:p-10 lg:p-14 text-center text-[#19261f] shadow-2xl flex flex-col items-center justify-center">
              <span className="mb-3 rounded-full bg-[#faf4e6] px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7c6630] border border-[#ecd8a6] sm:mb-6 sm:px-4 sm:text-xs">
                Mutiara Nasihat &amp; Hikmah
              </span>

              {data.advice.length === 0 ? (
                <div className="max-w-4xl mx-auto">
                  <p className="font-arabic text-2xl text-[#8a6820] leading-relaxed sm:text-4xl">
                    إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ
                  </p>
                  <p className="mt-3 text-lg font-bold text-[#19261f] leading-relaxed sm:mt-6 sm:text-2xl">
                    “Sesungguhnya shalat itu mencegah dari perbuatan-perbuatan keji dan mungkar.”
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[#2d946e] sm:mt-4 sm:text-sm">
                    QS. Al-Ankabut: 45
                  </p>
                </div>
              ) : (
                <div key={adviceIndex} className="animate-fade-in space-y-3 sm:space-y-6 max-w-4xl mx-auto">
                  <p className="text-xl font-bold leading-relaxed text-[#19261f] sm:text-3xl md:text-4xl">
                    “{data.advice[adviceIndex % data.advice.length].content}”
                  </p>
                  <p className="text-sm font-bold text-[#8a6820] sm:text-lg">
                    {data.advice[adviceIndex % data.advice.length].sourceReference ||
                      data.advice[adviceIndex % data.advice.length].authorOrSource ||
                      "Hadits Shahih"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Running Text Ticker */}
      {data.display.tickerEnabled && (
        <footer className="relative z-10 overflow-hidden border-t border-[#ded5c4] bg-[#fbf9f4] py-2 backdrop-blur sm:py-3 text-[#19261f]">
          <div className="flex items-center">
            <div className="z-10 flex shrink-0 items-center gap-2 bg-[#2d946e] px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-sm sm:px-4 sm:text-xs">
              <Sparkles className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" />
              <span>INFO MASJID</span>
            </div>
            <div className="overflow-hidden whitespace-nowrap text-sm font-medium text-[#3f5045] sm:text-base">
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
