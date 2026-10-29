import Link from "next/link";
import { MASJID_INFO } from "@/utils/constants";
import { MobilePrayerTaskbar } from "@/components/mobile-taskbar";
import {
  Compass,
  Home,
  Tv,
  MapPin,
  Calendar,
  Users,
  BookOpen,
  BookMarked,
  Timer,
  ExternalLink,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/jadwal-shalat", label: "Jadwal Shalat", icon: Calendar },
  { href: "/jadwal-imam", label: "Imam & Muadzin", icon: Users },
  { href: "/kiblat", label: "Arah Kiblat", icon: Compass },
  { href: "/jadwal-jumat", label: "Khatib Jumat", icon: BookOpen },
  { href: "/kajian", label: "Kajian", icon: BookMarked },
  { href: "/adzan-iqamah", label: "Adzan–Iqamah", icon: Timer },
];

export interface PublicMosqueInfo {
  name: string;
  address: string | null;
  mapUrl: string;
  shortName?: string;
  logoUrl?: string | null;
}

const DEFAULT_MOSQUE: PublicMosqueInfo = {
  name: MASJID_INFO.name,
  address: MASJID_INFO.address,
  mapUrl: MASJID_INFO.mapUrl,
  shortName: MASJID_INFO.shortName,
  logoUrl: null,
};

export function PublicShell({
  children,
  mosque = DEFAULT_MOSQUE,
}: {
  children: React.ReactNode;
  mosque?: PublicMosqueInfo;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf7f2] text-slate-800 print:bg-white print:text-black">
      {/* Top Clean Minimalist Ribbon */}
      <div className="border-b border-[#ded5c4] bg-[#f5efe4] py-1.5 text-center text-[11px] font-semibold tracking-wide text-[#5c6e63] print:hidden">
        <span>Pondok Tahfizh Plus Abu Dzar • Rumpin, Bogor</span>
      </div>

      {/* Main Glass Header */}
      <header className="sticky top-0 z-40 border-b border-[#ded5c4]/90 bg-[#faf7f2]/90 text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Logo / Mosque Title */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xl text-white shadow-sm ring-1 ring-[#ded5c4] transition-transform duration-200 group-hover:scale-105">
              {mosque.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mosque.logoUrl}
                  alt={mosque.shortName ?? "Logo"}
                  className="h-full w-full object-contain p-0.5"
                />
              ) : (
                <span>🕌</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base group-hover:text-[#557a64] transition-colors">
                  {mosque.shortName ?? MASJID_INFO.shortName}
                </p>
                <span className="hidden rounded-full bg-[#f4f7f5] px-2 py-0.5 text-[10px] font-semibold text-[#466553] sm:inline-block border border-[#d2dfd6]">
                  Resmi
                </span>
              </div>
              <p
                className="hidden max-w-[280px] truncate text-xs text-slate-500 sm:block"
                title={mosque.address ?? undefined}
              >
                {mosque.address ?? "Rumpin, Bogor"}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-1 xl:flex xl:gap-1.5">
            {LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-[#f4f7f5] hover:text-[#395243]"
                >
                  <Icon className="h-3.5 w-3.5 text-[#557a64] transition-colors" />
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
              className="flex items-center gap-1.5 rounded-lg bg-[#557a64] hover:bg-[#466553] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm active:scale-95 transition-all"
            >
              <Tv className="h-3.5 w-3.5 text-white" />
              <span className="hidden sm:inline">TV Display</span>
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal Scrollable Nav */}
        <nav className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-[#fcfdfc] px-3 py-2 xl:hidden no-scrollbar">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200/70 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-[#f4f7f5] hover:text-[#395243] hover:border-[#b0c7b7]"
              >
                <Icon className="h-3 w-3 text-[#557a64]" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-28 sm:px-6 sm:pb-12 lg:px-8 print:p-0 print:m-0 print:max-w-none">
        {children}
      </main>

      {/* Clean Minimalist Modern Footer */}
      <footer className="mt-auto border-t border-slate-100 bg-[#fafcfa] pb-24 sm:pb-0 print:hidden text-slate-600">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Mosque Identity */}
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🕌</span>
                <span className="text-sm font-bold text-slate-900">
                  {mosque.name}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Pusat ibadah, kajian keislaman, dan pendidikan tahfizh Al-Qur&apos;an di kawasan Rumpin, Kabupaten Bogor.
              </p>
              <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#557a64]" />
                <span>{mosque.address ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Layanan &amp; Informasi
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-500">
                <li>
                  <Link href="/jadwal-shalat" className="hover:text-[#557a64] transition-colors">
                    • Jadwal Shalat 7 Hari &amp; Iqamah
                  </Link>
                </li>
                <li>
                  <Link href="/jadwal-imam" className="hover:text-[#557a64] transition-colors">
                    • Jadwal Imam &amp; Muadzin Harian
                  </Link>
                </li>
                <li>
                  <Link href="/kiblat" className="hover:text-[#557a64] transition-colors">
                    • Kompas Arah Kiblat Digital
                  </Link>
                </li>
                <li>
                  <Link href="/jadwal-jumat" className="hover:text-[#557a64] transition-colors">
                    • Jadwal Khatib Khutbah Jumat
                  </Link>
                </li>
                <li>
                  <Link href="/kajian" className="hover:text-[#557a64] transition-colors">
                    • Agenda Kajian Rutin &amp; Tabligh Akbar
                  </Link>
                </li>
                <li>
                  <Link href="/tv" className="hover:text-[#557a64] transition-colors">
                    • TV Display Digital Masjid
                  </Link>
                </li>
              </ul>
            </div>

            {/* Location & Contact */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Peta &amp; Koordinat
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Kunjungi kami langsung atau buka penunjuk arah navigasi:
              </p>
              <a
                href={mosque.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#d2dfd6] bg-white px-3.5 py-2 text-xs font-semibold text-[#395243] shadow-sm transition-all hover:bg-[#f4f7f5] hover:border-[#b0c7b7]"
              >
                <MapPin className="h-3.5 w-3.5 text-[#557a64]" />
                <span>Buka Petunjuk Arah Google Maps</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
              <p className="mt-4 text-[11px] text-slate-400">
                Waktu shalat dihitung otomatis mengacu pada koordinat lintang &amp; bujur masjid dengan zona WIB.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row">
            <p>© {new Date().getFullYear()} {mosque.name}. Hak Cipta Dilindungi.</p>
            <p className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <span>WIB (UTC+7)</span>
              <span>•</span>
              <Link
                href="/admin"
                className="text-[#557a64] font-semibold hover:underline"
                title="Status Sistem Aktif"
              >
                Aktif
              </Link>
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Shortcut Taskbar */}
      <div className="print:hidden">
        <MobilePrayerTaskbar />
      </div>
    </div>
  );
}
