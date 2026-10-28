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
    accent: "from-[#2d946e] to-[#1c5240]",
  },
  {
    href: "/jadwal-imam",
    title: "Imam & Muadzin",
    arabic: "جدول الإمام والمؤذن",
    desc: "Daftar ustadz dan santri yang bertugas memimpin shalat berjamaah 5 waktu.",
    icon: Users,
    badge: "5 Waktu",
    accent: "from-[#457c6b] to-[#244f43]",
  },
  {
    href: "/jadwal-jumat",
    title: "Khatib Jumat",
    arabic: "خطيب الجمعة",
    desc: "Informasi khatib, imam shalat Jumat, serta tema khutbah setiap pekan.",
    icon: BookOpen,
    badge: "Pekan Ini",
    accent: "from-[#c5a059] to-[#997633]",
  },
  {
    href: "/kajian",
    title: "Jadwal Kajian",
    arabic: "المحاضرات والدروس",
    desc: "Agenda kajian rutin tafsir, hadits, fikih, dan majelis ta'lim terbuka untuk umum.",
    icon: BookMarked,
    badge: "Terbuka",
    accent: "from-[#577a88] to-[#34515c]",
  },
  {
    href: "/adzan-iqamah",
    title: "Adzan & Iqamah",
    arabic: "الأذان والإقامة",
    desc: "Hitung mundur presisi jeda waktu antara berkumandangnya adzan menuju iqamah.",
    icon: Timer,
    badge: "Live Timer",
    accent: "from-[#a86557] to-[#7f4236]",
  },
  {
    href: "/tv",
    title: "TV Display Digital",
    arabic: "شاشة المسجد الذكية",
    desc: "Tampilan layar TV masjid beresolusi tinggi dengan slide otomatis dan mode khutbah.",
    icon: MonitorPlay,
    badge: "Full Screen",
    accent: "from-[#1c3629] to-[#0c1a13]",
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
        <div className="relative overflow-hidden rounded-2xl border border-[#ded3be] bg-gradient-to-br from-[#fdfbf7] via-[#f7f2e5] to-[#f4ebe1] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c5a059]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#82621c] border border-[#c5a059]/30">
              <Sparkles className="h-3 w-3 text-[#c5a059]" />
              Khutbah Jumat Terdekat
            </span>
            <span className="text-xs font-semibold text-[#6d7c71]">
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "short",
                timeZone: "Asia/Jakarta",
              }).format(friday)}
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs text-[#8a6820] font-medium">Khatib Jumat</p>
            <h3 className="text-xl font-bold text-[#19261f]">
              {fridayKhatib?.khatibName ?? "Ust. Dr. Hasan Basri, Lc., M.A."}
            </h3>
            {fridayKhatib?.sermonTopic && (
              <p className="mt-2 text-sm text-[#4d5c52] leading-relaxed">
                Tema: <span className="font-semibold text-[#19261f]">“{fridayKhatib.sermonTopic}”</span>
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#ded3be]/70 pt-4">
            <Link
              href="/jadwal-jumat"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8a6820] hover:text-[#5a4211] transition-colors"
            >
              <span>Lihat Jadwal Khatib Lengkap</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Upcoming Kajian Spotlight */}
        <div className="relative overflow-hidden rounded-2xl border border-[#bde5d2] bg-gradient-to-br from-[#f8fdfb] via-[#edf7f3] to-[#e4f3ec] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3eb489]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1a5a43] border border-[#3eb489]/30">
              <BookMarked className="h-3 w-3 text-[#2d946e]" />
              Kajian Mendatang
            </span>
            <span className="text-xs font-semibold text-[#6d7c71]">Terbuka Untuk Umum</span>
          </div>

          <div className="mt-4">
            {upcomingKajian.length > 0 ? (
              <div>
                <h3 className="text-xl font-bold text-[#19261f]">
                  {upcomingKajian[0].title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#257659]">
                  Bersama: {upcomingKajian[0].speakerName}
                </p>
                <p className="mt-2 text-xs text-[#596a5f]">
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
                <h3 className="text-lg font-bold text-[#19261f]">
                  Kajian Rutin Tafsir Al-Qur&apos;an
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#257659]">
                  Bersama Asatidzah Pondok Tahfizh Plus Abu Dzar
                </p>
                <p className="mt-2 text-xs text-[#596a5f]">
                  Setiap Ba&apos;da Magrib di Ruang Utama Masjid Abu Dzar
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-[#bde5d2]/70 pt-4">
            <Link
              href="/kajian"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#205e48] hover:text-[#12392b] transition-colors"
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
          <span className="rounded-full bg-[#eee7db] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#4a584e]">
            Fasilitas &amp; Layanan
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#19261f] sm:text-3xl">
            Sistem Informasi Terpadu
          </h2>
          <p className="mt-1 max-w-xl text-xs text-[#5a685e] sm:text-sm">
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
                className="group relative flex flex-col justify-between rounded-2xl border border-[#e4dcce] bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#3eb489]/60 hover:shadow-xl hover:shadow-[#11231a]/6"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.accent} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-[#f4efe4] px-2.5 py-0.5 text-[10px] font-bold text-[#4d5b51] transition-colors group-hover:bg-[#eaf6f0] group-hover:text-[#1e6149]">
                      {card.badge}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="font-arabic text-xs text-[#8c7e6c] group-hover:text-[#2d946e] transition-colors">
                      {card.arabic}
                    </span>
                    <h3 className="mt-0.5 text-lg font-bold text-[#19261f] group-hover:text-[#205e48] transition-colors">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-[#5a685e]">
                      {card.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-1 text-xs font-bold text-[#2d946e] group-hover:gap-2 transition-all">
                  <span>Buka Halaman</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Inspirational Hadith / Islamic Advice Card */}
      <section className="mt-14 overflow-hidden rounded-3xl border border-[#ded5c4] bg-gradient-to-br from-[#fdfbf7] via-[#f7f3ea] to-[#f1eae0] p-8 text-[#19261f] shadow-lg sm:p-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#faf4e6] border border-[#ecd8a6] text-[#8a6820] shadow-sm">
            <Quote className="h-5 w-5" />
          </div>
          <p className="mt-4 font-arabic text-xl font-bold leading-relaxed text-[#8a6820] sm:text-2xl">
            {featuredAdvice.content}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#2d946e]">
            {featuredAdvice.sourceReference ?? "Hadits / Nasihat Islami"}
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
