import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { HomeHero } from "@/components/home-hero";
import { getMosqueSettings } from "@/lib/settings";
import { calculatePrayerTimes, getNextPrayer } from "@/lib/prayer-times";
import { formatDateOnlyLong, todayDateOnly } from "@/lib/datetime";
import {
  getAdviceSafe,
  getImamSchedulesBetween,
  getKajianSafe,
  getKhatibScheduleForDate,
  nextFriday,
} from "@/lib/schedule-data";
import {
  CalendarClock,
  Users,
  BookOpen,
  BookMarked,
  MonitorPlay,
  ArrowRight,
  Sparkles,
  Quote,
  Clock,
  CalendarDays,
  MapPin,
  Compass,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CARDS = [
  {
    href: "/jadwal-shalat",
    title: "Jadwal Shalat",
    arabic: "مواقيت الصلاة",
    desc: "Jadwal waktu shalat 7 hari ke depan beserta estimasi waktu iqamah harian.",
    icon: CalendarClock,
    badge: "Otomatis WIB",
    accent: "bg-[#2d946e]",
  },
  {
    href: "/jadwal-imam",
    title: "Imam & Muadzin",
    arabic: "جدول الإمام والمؤذن",
    desc: "Daftar asatidz dan santri yang bertugas memimpin shalat berjamaah 5 waktu.",
    icon: Users,
    badge: "5 Waktu",
    accent: "bg-[#1e6149]",
  },
  {
    href: "/jadwal-jumat",
    title: "Khatib Jumat",
    arabic: "خطيب الجمعة",
    desc: "Informasi khatib, imam shalat Jumat, serta tema khutbah setiap pekan.",
    icon: BookOpen,
    badge: "Pekan Ini",
    accent: "bg-[#8a6820]",
  },
  {
    href: "/kajian",
    title: "Jadwal Kajian",
    arabic: "المحاضرات والدروس",
    desc: "Agenda kajian rutin tafsir, hadits, fikih, dan majelis ta'lim terbuka untuk umum.",
    icon: BookMarked,
    badge: "Terbuka",
    accent: "bg-[#2d946e]",
  },
  {
    href: "/kiblat",
    title: "Kompas Kiblat",
    arabic: "اتجاه القبلة",
    desc: "Penunjuk arah kiblat presisi online berbasis giroskop sensor HP menuju Ka'bah.",
    icon: Compass,
    badge: "Presisi",
    accent: "bg-[#7c6630]",
  },
  {
    href: "/tv",
    title: "TV Display Digital",
    arabic: "شاشة المسجد الذكية",
    desc: "Tampilan layar TV masjid beresolusi tinggi dengan slide otomatis dan mode khutbah.",
    icon: MonitorPlay,
    badge: "Full Screen",
    accent: "bg-[#19261f]",
  },
];

const FIVE_PRAYERS = [
  { key: "fajr", name: "Subuh" },
  { key: "dhuhr", name: "Zuhur" },
  { key: "asr", name: "Asar" },
  { key: "maghrib", name: "Magrib" },
  { key: "isha", name: "Isya" },
] as const;

export default async function Home() {
  const mosque = await getMosqueSettings();
  const today = todayDateOnly();
  const now = new Date();

  const prayerTimes = calculatePrayerTimes(today, {
    method: mosque.prayerCalculationMethod,
    asrMethod: mosque.asrMethod,
    adjustments: mosque.prayerAdjustments,
    latitude: mosque.latitude,
    longitude: mosque.longitude,
  });

  const nextPrayer = getNextPrayer(prayerTimes, today, now, {
    method: mosque.prayerCalculationMethod,
    asrMethod: mosque.asrMethod,
    adjustments: mosque.prayerAdjustments,
    latitude: mosque.latitude,
    longitude: mosque.longitude,
  });

  const friday = nextFriday(today);

  // Concurrently fetch all live database resources
  const [todayImams, fridayKhatib, upcomingKajian, adviceList] =
    await Promise.all([
      getImamSchedulesBetween(today, today).catch(() => []),
      getKhatibScheduleForDate(friday).catch(() => null),
      getKajianSafe(now, 4).catch(() => []),
      getAdviceSafe().catch(() => []),
    ]);

  const featuredAdvice = adviceList[0] ?? {
    content: "Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar.",
    sourceReference: "QS. Al-'Ankabut: 45",
  };

  const todayStr = formatDateOnlyLong(today);
  const fridayStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(friday);

  return (
    <PublicShell
      mosque={{
        name: mosque.mosqueName,
        logoUrl: mosque.logoUrl,
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
    >
      {/* Hero Section with Live Clock, Next Prayer, & Mosque Logo */}
      <HomeHero
        prayerTimes={prayerTimes}
        nextPrayer={{
          key: nextPrayer.key,
          label: nextPrayer.label,
          time: nextPrayer.time,
          target: nextPrayer.target.toISOString(),
          tomorrow: nextPrayer.tomorrow,
        }}
        mosqueName={mosque.mosqueName}
        mosqueAddress={mosque.address}
        logoUrl={mosque.logoUrl}
      />

      {/* ========================================================
          BAGIAN 1: JADWAL HARIAN (Jadwal Sholat & Jadwal Imam Hari Ini)
          ======================================================== */}
      <section className="mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ded5c4] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#2d946e]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1e6149] border border-[#2d946e]/20 mb-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-[#2d946e]" />
              <span>Jadwal Harian</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#19261f] tracking-tight">
              Jadwal Sholat &amp; Petugas Imam Hari Ini
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#5c6e63]">
            {todayStr}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Sub-card A: Waktu Shalat Hari Ini (5 Col) */}
          <div className="lg:col-span-5 rounded-2xl border border-[#ded5c4] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e8dfcf] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#2d946e]" />
                <h3 className="font-bold text-sm text-[#19261f]">Waktu Shalat</h3>
              </div>
              <span className="text-[11px] font-semibold text-[#2d946e] bg-[#eaf6f0] px-2.5 py-0.5 rounded-full border border-[#2d946e]/20">
                WIB (Waktu Indonesia Barat)
              </span>
            </div>

            <div className="space-y-2">
              {[
                { key: "imsak", label: "Imsak", time: prayerTimes.imsak },
                { key: "fajr", label: "Subuh", time: prayerTimes.fajr },
                { key: "sunrise", label: "Terbit", time: prayerTimes.sunrise },
                { key: "dhuhr", label: "Zuhur", time: prayerTimes.dhuhr },
                { key: "asr", label: "Asar", time: prayerTimes.asr },
                { key: "maghrib", label: "Magrib", time: prayerTimes.maghrib },
                { key: "isha", label: "Isya", time: prayerTimes.isha },
              ].map((p) => {
                const isNext =
                  !nextPrayer.tomorrow && nextPrayer.key === p.key;

                return (
                  <div
                    key={p.key}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition-all ${
                      isNext
                        ? "bg-[#eaf6f0] border border-[#2d946e] text-[#1e6149] shadow-xs font-bold ring-1 ring-[#2d946e]/20"
                        : "bg-[#fcfaf6] border border-[#ded5c4]/60 text-slate-700 hover:bg-[#faf7f2]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{p.label}</span>
                      {isNext && (
                        <span className="rounded-full bg-[#2d946e] px-1.5 py-0.2 text-[9px] font-black uppercase text-white">
                          Berikutnya
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-sm font-black">
                      {p.time}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-[#e8dfcf] flex items-center justify-between">
              <Link
                href="/jadwal-shalat"
                className="text-xs font-bold text-[#2d946e] hover:text-[#1e6149] inline-flex items-center gap-1 transition-colors"
              >
                <span>Lihat Jadwal 7 Hari ke Depan</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Sub-card B: Petugas Imam & Muadzin Hari Ini (7 Col) */}
          <div className="lg:col-span-7 rounded-2xl border border-[#ded5c4] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#e8dfcf] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#8a6820]" />
                  <h3 className="font-bold text-sm text-[#19261f]">
                    Petugas Imam &amp; Muadzin 5 Waktu
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-[#8a6820] bg-[#faf4e6] px-2.5 py-0.5 rounded-full border border-[#ecd8a6]">
                  Tersinkron Database
                </span>
              </div>

              <div className="space-y-2.5">
                {FIVE_PRAYERS.map((pr) => {
                  const assignment = todayImams.find(
                    (item) =>
                      item.prayerName.toLowerCase() === pr.name.toLowerCase()
                  );
                  const imamName = assignment?.imamName || "Asatidzah Pondok";
                  const muadzinName =
                    assignment?.muadzinName || "Santri Pondok Tahfizh";
                  const isCurrentNext =
                    !nextPrayer.tomorrow && nextPrayer.key === pr.key;

                  return (
                    <div
                      key={pr.key}
                      className={`grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr_1fr] items-center gap-3 p-3 rounded-xl border transition-all ${
                        isCurrentNext
                          ? "border-[#2d946e] bg-[#f2faf5] shadow-xs ring-1 ring-[#2d946e]/20"
                          : "border-[#ded5c4]/60 bg-[#fcfaf6] hover:bg-[#faf7f2]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block rounded-md bg-[#2d946e]/10 px-2 py-1 text-xs font-black uppercase text-[#1e6149] border border-[#2d946e]/20">
                          {pr.name}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-[#5c6e63]">
                          Imam
                        </p>
                        <p className="truncate text-xs sm:text-sm font-extrabold text-[#19261f]">
                          {imamName}
                        </p>
                      </div>

                      <div className="min-w-0 col-span-2 sm:col-span-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#ded5c4]/40">
                        <p className="text-[10px] uppercase font-bold text-[#5c6e63]">
                          Muadzin
                        </p>
                        <p className="truncate text-xs sm:text-sm font-semibold text-[#5c6e63]">
                          {muadzinName}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e8dfcf] flex items-center justify-between">
              <Link
                href="/jadwal-imam"
                className="text-xs font-bold text-[#2d946e] hover:text-[#1e6149] inline-flex items-center gap-1 transition-colors"
              >
                <span>Lihat Rotasi &amp; Penugasan Lengkap</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          BAGIAN 2: JADWAL PEKANAN (Khatib Jumat & Kajian Pekan Ini)
          ======================================================== */}
      <section className="mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ded5c4] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#8a6820]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#8a6820] border border-[#8a6820]/20 mb-1.5">
              <BookOpen className="h-3.5 w-3.5 text-[#8a6820]" />
              <span>Jadwal Pekanan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#19261f] tracking-tight">
              Khatib Jumat &amp; Agenda Kajian Pekan Berjalan
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#5c6e63]">
            Pekan Ini
          </span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Card 1: Khatib Jumat Terdekat */}
          <div className="relative overflow-hidden rounded-2xl border border-[#ded5c4] bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#faf4e6] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#7c6630] border border-[#ecd8a6]">
                  <Sparkles className="h-3 w-3 text-[#8a6820]" />
                  Khutbah Jumat Pekan Ini
                </span>
                <span className="text-xs font-semibold text-[#5c6e63]">
                  {fridayStr}
                </span>
              </div>

              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-wider text-[#5c6e63] font-bold">
                  Khatib Shalat Jumat
                </p>
                <h3 className="mt-1 text-xl sm:text-2xl font-black text-[#19261f]">
                  {fridayKhatib?.khatibName || "Belum Ditentukan"}
                </h3>

                {fridayKhatib?.sermonTopic && (
                  <div className="mt-3 rounded-xl bg-[#fcfaf6] border border-[#ded5c4]/60 p-3">
                    <p className="text-[11px] font-bold text-[#8a6820] uppercase tracking-wider">
                      Tema Khutbah:
                    </p>
                    <p className="text-sm font-semibold text-[#19261f] mt-0.5">
                      “{fridayKhatib.sermonTopic}”
                    </p>
                  </div>
                )}

                {fridayKhatib?.backupKhatibName && (
                  <p className="mt-2 text-xs text-[#5c6e63]">
                    Khatib Cadangan:{" "}
                    <span className="font-semibold text-[#19261f]">
                      {fridayKhatib.backupKhatibName}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#e8dfcf] pt-4">
              <Link
                href="/jadwal-jumat"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8a6820] hover:text-[#5d4615] transition-colors"
              >
                <span>Lihat Roster Khatib Lengkap</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Jadwal Kajian Pekan Ini */}
          <div className="relative overflow-hidden rounded-2xl border border-[#ded5c4] bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf6f0] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1e6149] border border-[#2d946e]/20">
                  <BookMarked className="h-3 w-3 text-[#2d946e]" />
                  Agenda Kajian Islam
                </span>
                <span className="text-xs font-semibold text-[#5c6e63]">
                  Terbuka Untuk Umum
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {upcomingKajian.length > 0 ? (
                  upcomingKajian.map((k) => (
                    <div
                      key={k.id}
                      className="rounded-xl border border-[#ded5c4]/60 bg-[#fcfaf6] p-3 transition-colors hover:bg-[#faf7f2]"
                    >
                      <h4 className="text-sm font-bold text-[#19261f]">
                        {k.title}
                      </h4>
                      <p className="mt-0.5 text-xs font-semibold text-[#2d946e]">
                        Pemateri: {k.speakerName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#5c6e63]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-[#8a6820]" />
                          {new Intl.DateTimeFormat("id-ID", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Jakarta",
                          }).format(new Date(k.startDateTime))}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#2d946e]" />
                          {k.location}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[#ded5c4] bg-[#fcfaf6] p-6 text-center">
                    <p className="text-xs font-semibold text-[#5c6e63]">
                      Belum ada jadwal kajian untuk pekan ini.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-[#e8dfcf] pt-4">
              <Link
                href="/kajian"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2d946e] hover:text-[#1e6149] transition-colors"
              >
                <span>Lihat Semua Jadwal Kajian</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid (Fasilitas & Layanan) */}
      <section className="mt-14">
        <div className="flex flex-col items-center text-center">
          <span className="rounded-full bg-[#f4f7f5] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#466553] border border-[#d2dfd6]">
            Fasilitas &amp; Layanan
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#19261f] sm:text-3xl">
            Sistem Informasi Terpadu
          </h2>
          <p className="mt-1 max-w-xl text-xs text-[#5c6e63] sm:text-sm">
            Akses informasi jadwal ibadah, kegiatan taklim, dan tata tertib masjid secara transparan &amp; akurat.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#ded5c4] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2d946e]/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#f4f7f5] px-2.5 py-0.5 text-[10px] font-bold text-[#395243] border border-[#d2dfd6]">
                      {card.badge}
                    </span>
                    <span className="font-arabic text-xs text-[#8a6820]">
                      {card.arabic}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.accent} text-white shadow-xs group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#19261f] group-hover:text-[#2d946e] transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-[11px] text-[#5c6e63]">Abu Dzar</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-[#5c6e63]">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#2d946e] group-hover:gap-2 transition-all">
                  <span>Buka Informasi</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tausiyah / Advice Quote Box */}
      {featuredAdvice && (
        <section className="mt-14 mb-8">
          <div className="relative overflow-hidden rounded-3xl border border-[#ded5c4] bg-gradient-to-br from-[#fcfaf6] via-[#f7f3ec] to-[#faf7f2] p-6 text-center sm:p-10 shadow-xs">
            <Quote className="mx-auto h-8 w-8 text-[#8a6820]/40 mb-3" />
            <blockquote className="mx-auto max-w-2xl text-base sm:text-lg font-medium italic text-[#19261f] leading-relaxed">
              &ldquo;{featuredAdvice.content}&rdquo;
            </blockquote>
            {featuredAdvice.sourceReference && (
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#8a6820]">
                — {featuredAdvice.sourceReference}
              </p>
            )}
          </div>
        </section>
      )}
    </PublicShell>
  );
}
