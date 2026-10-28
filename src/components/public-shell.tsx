import Link from "next/link";
import { MASJID_INFO } from "@/utils/constants";
import {
  Compass,
  Tv,
  LogIn,
  MapPin,
  Calendar,
  Users,
  BookOpen,
  BookMarked,
  Timer,
  ExternalLink,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Beranda", icon: Compass },
  { href: "/jadwal-shalat", label: "Jadwal Shalat", icon: Calendar },
  { href: "/jadwal-imam", label: "Imam & Muadzin", icon: Users },
  { href: "/jadwal-jumat", label: "Khatib Jumat", icon: BookOpen },
  { href: "/kajian", label: "Kajian", icon: BookMarked },
  { href: "/adzan-iqamah", label: "Adzan–Iqamah", icon: Timer },
];

export interface PublicMosqueInfo {
  name: string;
  address: string | null;
  mapUrl: string;
  shortName?: string;
}

const DEFAULT_MOSQUE: PublicMosqueInfo = {
  name: MASJID_INFO.name,
  address: MASJID_INFO.address,
  mapUrl: MASJID_INFO.mapUrl,
  shortName: MASJID_INFO.shortName,
};

export function PublicShell({
  children,
  mosque = DEFAULT_MOSQUE,
}: {
  children: React.ReactNode;
  mosque?: PublicMosqueInfo;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 bg-islamic-pattern-light text-slate-800">
      {/* Top Banner Ribbon */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 py-1 text-center text-[11px] font-medium tracking-wider text-emerald-300">
        <span className="font-arabic text-xs mr-2">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
        <span>• Pondok Tahfizh Plus Abu Dzar • Rumpin, Bogor</span>
      </div>

      {/* Main Glass Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-slate-900/90 text-white shadow-lg backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Logo / Mosque Title */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-2xl shadow-md shadow-emerald-900/30 ring-2 ring-emerald-400/20 transition-all duration-300 group-hover:scale-105 group-hover:ring-emerald-400">
              <span className="relative z-10">🕌</span>
              <div className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-sm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold tracking-tight text-white sm:text-lg group-hover:text-emerald-300 transition-colors">
                  {mosque.shortName ?? MASJID_INFO.shortName}
                </p>
                <span className="hidden rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 sm:inline-block border border-emerald-500/30">
                  Resmi
                </span>
              </div>
              <p
                className="hidden max-w-[280px] truncate text-xs text-slate-400 sm:block"
                title={mosque.address ?? undefined}
              >
                {mosque.address ?? "Rumpin, Bogor"}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-1 xl:flex xl:gap-2">
            {LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/tv"
              target="_blank"
              aria-label="Buka TV Display"
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-900/40 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-900/60 active:scale-95 transition-all sm:px-3.5"
            >
              <Tv className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">TV Display</span>
            </Link>

            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 backdrop-blur hover:bg-white/15 hover:border-white/30 active:scale-95 transition-all"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal Scrollable Nav */}
        <nav className="flex gap-1 overflow-x-auto border-t border-white/5 bg-slate-950/60 px-3 py-2 xl:hidden no-scrollbar">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
              >
                <Icon className="h-3 w-3 text-emerald-400" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Modern Luxury Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Mosque Identity */}
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🕌</span>
                <span className="text-base font-bold text-slate-900">
                  {mosque.name}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Pusat ibadah, kajian keislaman, dan pendidikan tahfizh Al-Qur&apos;an di kawasan Rumpin, Kabupaten Bogor.
              </p>
              <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{mosque.address ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Layanan &amp; Informasi
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li>
                  <Link href="/jadwal-shalat" className="hover:text-emerald-600 transition-colors">
                    • Jadwal Shalat 7 Hari &amp; Iqamah
                  </Link>
                </li>
                <li>
                  <Link href="/jadwal-imam" className="hover:text-emerald-600 transition-colors">
                    • Jadwal Imam &amp; Muadzin Harian
                  </Link>
                </li>
                <li>
                  <Link href="/jadwal-jumat" className="hover:text-emerald-600 transition-colors">
                    • Jadwal Khatib Khutbah Jumat
                  </Link>
                </li>
                <li>
                  <Link href="/kajian" className="hover:text-emerald-600 transition-colors">
                    • Agenda Kajian Rutin &amp; Tabligh Akbar
                  </Link>
                </li>
                <li>
                  <Link href="/tv" className="hover:text-emerald-600 transition-colors">
                    • TV Display Digital Masjid
                  </Link>
                </li>
              </ul>
            </div>

            {/* Location & Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Peta &amp; Koordinat
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Kunjungi kami langsung atau buka penunjuk arah navigasi:
              </p>
              <a
                href={mosque.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition-all hover:bg-emerald-100 hover:border-emerald-400"
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>Buka Petunjuk Arah Google Maps</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
              <p className="mt-4 text-[11px] text-slate-400">
                Waktu shalat dihitung otomatis mengacu pada koordinat lintang &amp; bujur masjid dengan zona WIB.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row">
            <p>© {new Date().getFullYear()} {mosque.name}. Hak Cipta Dilindungi.</p>
            <p className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
              <span>WIB (UTC+7)</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">Aktif</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
