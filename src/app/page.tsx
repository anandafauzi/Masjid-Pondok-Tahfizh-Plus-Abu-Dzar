import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { HomeHero } from "@/components/home-hero";
import { getMosqueSettings } from "@/lib/settings";
import { calculatePrayerTimes, getNextPrayer } from "@/lib/prayer-times";
import { todayDateOnly } from "@/lib/datetime";
import {
  getAdviceSafe,
  getKajianSafe,
  getKhatibScheduleForDate,
  nextFriday,
} from "@/lib/schedule-data";
import {
  CalendarClock,
  Users,
  BookOpen,
  BookMarked,
  Timer,
  MonitorPlay,
  ArrowRight,
  Sparkles,
  Quote,
} from "lucide-react";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: "/jadwal-shalat",
    title: "Jadwal Shalat",
    arabic: "مواقيت الصلاة",
    desc: "Jadwal waktu shalat 7 hari ke depan beserta estimasi waktu iqamah harian.",
    icon: CalendarClock,
    badge: "Otomatis WIB",
    accent: "bg-[#557a64]",
  },
  {
    href: "/jadwal-imam",
    title: "Imam & Muadzin",
    arabic: "جدول الإمام والمؤذن",
    desc: "Daftar asatidz dan santri yang bertugas memimpin shalat berjamaah 5 waktu.",
    icon: Users,
    badge: "5 Waktu",
    accent: "bg-[#466553]",
  },
  {
    href: "/jadwal-jumat",
    title: "Khatib Jumat",
    arabic: "خطيب الجمعة",
    desc: "Informasi khatib, imam shalat Jumat, serta tema khutbah setiap pekan.",
    icon: BookOpen,
    badge: "Pekan Ini",
    accent: "bg-[#395243]",
  },
  {
    href: "/kajian",
    title: "Jadwal Kajian",
    arabic: "المحاضرات والدروس",
    desc: "Agenda kajian rutin tafsir, hadits, fikih, dan majelis ta'lim terbuka untuk umum.",
    icon: BookMarked,
    badge: "Terbuka",
    accent: "bg-[#557a64]",
  },
  {
    href: "/adzan-iqamah",
    title: "Adzan & Iqamah",
    arabic: "الأذان والإقامة",
    desc: "Hitung mundur presisi jeda waktu antara berkumandangnya adzan menuju iqamah.",
    icon: Timer,
    badge: "Live Timer",
    accent: "bg-[#466553]",
  },
  {
    href: "/tv",
    title: "TV Display Digital",
    arabic: "شاشة المسجد الذكية",
    desc: "Tampilan layar TV masjid beresolusi tinggi dengan slide otomatis dan mode khutbah.",
    icon: MonitorPlay,
    badge: "Full Screen",
    accent: "bg-[#0f172a]",
  },
];

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
  const [fridayKhatib, upcomingKajian, adviceList] = await Promise.all([
    getKhatibScheduleForDate(friday).catch(() => null),
    getKajianSafe(now, 2).catch(() => []),
    getAdviceSafe().catch(() => []),
  ]);

  const featuredAdvice = adviceList[0] ?? {
    content: "Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar.",
    sourceReference: "QS. Al-'Ankabut: 45",
  };

  return (
    <PublicShell
      mosque={{
        name: mosque.mosqueName,
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
    >
      {/* Hero Section */}
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
      />

      {/* Information Highlight Cards (Friday + Kajian) */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Friday Khatib Spotlight */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:border-[#b0c7b7] transition-all">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f7f5] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#395243] border border-[#d2dfd6]">
              <Sparkles className="h-3 w-3 text-[#557a64]" />
              Khutbah Jumat Terdekat
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "short",
                timeZone: "Asia/Jakarta",
              }).format(friday)}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-400 font-medium">Khatib Jumat</p>
            <h3 className="text-xl font-bold text-slate-900">
              {fridayKhatib?.khatibName ?? "Ust. Dr. Hasan Basri, Lc., M.A."}
            </h3>
            {fridayKhatib?.sermonTopic && (
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Tema: <span className="font-semibold text-slate-800">“{fridayKhatib.sermonTopic}”</span>
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <Link
              href="/jadwal-jumat"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#557a64] hover:text-[#395243] transition-colors"
            >
              <span>Lihat Jadwal Khatib Lengkap</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Upcoming Kajian Spotlight */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:border-[#b0c7b7] transition-all">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f7f5] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#395243] border border-[#d2dfd6]">
              <BookMarked className="h-3 w-3 text-[#557a64]" />
              Kajian Mendatang
            </span>
            <span className="text-xs font-semibold text-slate-500">Terbuka Untuk Umum</span>
          </div>

          <div className="mt-4">
            {upcomingKajian.length > 0 ? (
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {upcomingKajian[0].title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#557a64]">
                  Bersama: {upcomingKajian[0].speakerName}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "full",
                    timeStyle: "short",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(upcomingKajian[0].startDateTime))}{" "}
                  • {upcomingKajian[0].location}
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Kajian Rutin Tafsir Al-Qur&apos;an
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#557a64]">
                  Bersama Asatidzah Pondok Tahfizh Plus Abu Dzar
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Setiap Ba&apos;da Magrib di Ruang Utama Masjid Abu Dzar
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <Link
              href="/kajian"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#557a64] hover:text-[#395243] transition-colors"
            >
              <span>Lihat Semua Jadwal Kajian</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="mt-12">
        <div className="flex flex-col items-center text-center">
          <span className="rounded-full bg-[#f4f7f5] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#466553] border border-[#d2dfd6]">
            Fasilitas &amp; Layanan
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Sistem Informasi Terpadu
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500 sm:text-sm">
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
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b0c7b7] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.accent} text-white shadow-sm transition-transform duration-200 group-hover:scale-105`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 transition-colors group-hover:bg-[#f4f7f5] group-hover:text-[#395243]">
                      {card.badge}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="font-arabic text-xs text-slate-400 group-hover:text-[#557a64] transition-colors">
                      {card.arabic}
                    </span>
                    <h3 className="mt-0.5 text-base font-bold text-slate-900 group-hover:text-[#395243] transition-colors">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-[#557a64] group-hover:gap-1.5 transition-all">
                  <span>Buka Halaman</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Inspirational Hadith / Islamic Advice Card */}
      <section className="mt-14 overflow-hidden rounded-3xl border border-slate-200/80 bg-[#fbfdfc] p-8 text-slate-800 shadow-sm sm:p-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f7f5] border border-[#d2dfd6] text-[#557a64] shadow-sm">
            <Quote className="h-4 w-4" />
          </div>
          <p className="mt-4 font-arabic text-xl font-bold leading-relaxed text-[#395243] sm:text-2xl">
            {featuredAdvice.content}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#557a64]">
            {featuredAdvice.sourceReference ?? "Hadits / Nasihat Islami"}
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
