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
    <div className="flex min-h-screen flex-col bg-[#faf7f2] bg-islamic-pattern-light text-[#19261f] print:bg-white print:text-black">
      {/* Top Banner Ribbon */}
      <div className="border-b border-[#e6decb] bg-[#f4eee2] py-1.5 text-center text-[11px] font-medium tracking-wider text-[#6a5e46] print:hidden">
        <span className="font-arabic text-xs mr-2 font-bold text-[#8a6820]">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
        <span className="text-[#526358]">• Pondok Tahfizh Plus Abu Dzar • Rumpin, Bogor</span>
      </div>

      {/* Main Glass Header */}
      <header className="sticky top-0 z-40 border-b border-[#ded5c4] bg-[#fdfbf7]/95 text-[#19261f] shadow-sm backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Logo / Mosque Title */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#3eb489] to-[#206f52] text-2xl shadow-sm ring-2 ring-[#bde5d2] transition-all duration-300 group-hover:scale-105 group-hover:ring-[#3eb489]">
              <span className="relative z-10">🕌</span>
              <div className="absolute inset-0 rounded-xl bg-[#3eb489]/20 blur-sm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-extrabold tracking-tight text-[#19261f] sm:text-lg group-hover:text-[#2d946e] transition-colors">
                  {mosque.shortName ?? MASJID_INFO.shortName}
                </p>
                <span className="hidden rounded-full bg-[#eaf6f0] px-2 py-0.5 text-[10px] font-semibold text-[#1e6149] sm:inline-block border border-[#bde5d2]">
                  Resmi
                </span>
              </div>
              <p
                className="hidden max-w-[280px] truncate text-xs text-[#607066] sm:block"
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
                  className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#3f5045] transition-all hover:bg-[#eaf6f0] hover:text-[#1e6149]"
                >
                  <Icon className="h-3.5 w-3.5 text-[#2d946e] transition-colors" />
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
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2d946e] to-[#206f52] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-[#35a87e] hover:to-[#267f5e] active:scale-95 transition-all sm:px-3.5"
            >
              <Tv className="h-3.5 w-3.5 text-white" />
              <span className="hidden sm:inline">TV Display</span>
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal Scrollable Nav */}
        <nav className="flex gap-1.5 overflow-x-auto border-t border-[#ded5c4] bg-[#fbf9f4] px-3 py-2 xl:hidden no-scrollbar">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#e4dcce] bg-white px-2.5 py-1 text-xs font-medium text-[#3f5045] transition-colors hover:bg-[#eaf6f0] hover:text-[#1e6149] hover:border-[#bde5d2]"
              >
                <Icon className="h-3 w-3 text-[#2d946e]" />
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

      {/* Modern Luxury Pantone Cream Footer */}
      <footer className="mt-auto border-t border-[#e2d9c8] bg-[#f5f0e4]/90 backdrop-blur-md pb-24 sm:pb-0 print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Mosque Identity */}
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🕌</span>
                <span className="text-base font-bold text-[#19261f]">
                  {mosque.name}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#4e5e54]">
                Pusat ibadah, kajian keislaman, dan pendidikan tahfizh Al-Qur&apos;an di kawasan Rumpin, Kabupaten Bogor.
              </p>
              <div className="mt-3 flex items-start gap-2 text-xs text-[#4e5e54]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2d946e]" />
                <span>{mosque.address ?? "Rumpin, Kabupaten Bogor, Jawa Barat"}</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#19261f]">
                Layanan &amp; Informasi
              </p>
              <ul className="mt-3 space-y-2 text-xs text-[#4e5e54]">
                <li>
                  <Link href="/jadwal-shalat" className="hover:text-[#257659] transition-colors">
                    • Jadwal Shalat 7 Hari &amp; Iqamah
                  </Link>
                </li>
                <li>
                  <Link href="/jadwal-imam" className="hover:text-[#257659] transition-colors">
                    • Jadwal Imam &amp; Muadzin Harian
                  </Link>
                </li>
                <li>
                  <Link href="/kiblat" className="hover:text-[#257659] transition-colors">
                    • Kompas Arah Kiblat Digital
                  </Link>
                </li>
                <li>
                  <Link href="/jadwal-jumat" className="hover:text-[#257659] transition-colors">
                    • Jadwal Khatib Khutbah Jumat
                  </Link>
                </li>
                <li>
                  <Link href="/kajian" className="hover:text-[#257659] transition-colors">
                    • Agenda Kajian Rutin &amp; Tabligh Akbar
                  </Link>
                </li>
                <li>
                  <Link href="/tv" className="hover:text-[#257659] transition-colors">
                    • TV Display Digital Masjid
                  </Link>
                </li>
              </ul>
            </div>

            {/* Location & Contact */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#19261f]">
                Peta &amp; Koordinat
              </p>
              <p className="mt-2 text-xs text-[#748479]">
                Kunjungi kami langsung atau buka penunjuk arah navigasi:
              </p>
              <a
                href={mosque.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#bde5d2] bg-[#eef8f3] px-3.5 py-2 text-xs font-semibold text-[#1e6149] shadow-sm transition-all hover:bg-[#ddf2e8] hover:border-[#8fd2b5]"
              >
                <MapPin className="h-3.5 w-3.5 text-[#2d946e]" />
                <span>Buka Petunjuk Arah Google Maps</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
              <p className="mt-4 text-[11px] text-[#748479]">
                Waktu shalat dihitung otomatis mengacu pada koordinat lintang &amp; bujur masjid dengan zona WIB.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[#e5dcce] pt-6 text-xs text-[#748479] sm:flex-row">
            <p>© {new Date().getFullYear()} {mosque.name}. Hak Cipta Dilindungi.</p>
            <p className="flex items-center gap-1 font-mono text-[11px] text-[#596a60]">
              <span>WIB (UTC+7)</span>
              <span>•</span>
              <Link
                href="/admin"
                className="text-[#257659] font-bold hover:underline"
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
