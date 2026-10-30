"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarClock,
  Users,
  UserCheck,
  BookOpen,
  BookMarked,
  Timer,
  MessageSquareQuote,
  Megaphone,
  MonitorPlay,
  Radio,
  Building2,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Smartphone,
  Share2,
  CheckCircle2,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/petugas", label: "Data Petugas", icon: UserCheck },
  { href: "/admin/prayer-times", label: "Jadwal Shalat", icon: CalendarClock },
  { href: "/admin/imam", label: "Imam & Muadzin", icon: Users },
  { href: "/admin/khatib", label: "Khatib Jumat", icon: BookOpen },
  { href: "/admin/kajian", label: "Kajian", icon: BookMarked },
  { href: "/admin/iqamah", label: "Iqamah", icon: Timer },
  { href: "/admin/nasihat", label: "Nasihat", icon: MessageSquareQuote },
  { href: "/admin/running-text", label: "Running Text", icon: Megaphone },
  { href: "/admin/tv", label: "Tampilan TV", icon: MonitorPlay },
  { href: "/admin/khutbah", label: "Khutbah Jumat", icon: Radio },
  { href: "/admin/masjid", label: "Pengaturan Masjid", icon: Building2 },
  { href: "/admin/users", label: "Pengguna", icon: ShieldCheck, superOnly: true },
  { href: "/admin/audit", label: "Log Aktivitas", icon: ScrollText },
];

export function AdminShell({
  user,
  logoUrl,
  children,
}: {
  user: { name: string; email: string; role: string };
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true
      ) {
        setIsStandalone(true);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    }
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const items = NAV.filter(
    (item) => !item.superOnly || user.role === "SUPER_ADMIN"
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-white text-slate-800 border-r border-slate-200/90 shadow-sm">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#ded5c4] bg-[#faf7f2]/80">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-2xl shadow-xs ring-1 ring-[#ded5c4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl || "/logo-masjid.png"}
            alt="Logo Masjid"
            className="h-full w-full object-contain p-1"
          />
        </div>
        <div>
          <p className="text-sm font-extrabold leading-tight text-slate-900">
            Masjid Abu Dzar
          </p>
          <p className="text-xs text-sage-600 font-semibold">Panel Administrasi</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                active
                  ? "bg-sage-600 text-white shadow-sm font-bold"
                  : "text-slate-600 hover:bg-sage-50/60 hover:text-sage-800"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-sage-600"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50 space-y-2">
        {!isStandalone && (
          <button
            type="button"
            onClick={handleInstallApp}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-xs font-bold text-sage-800 hover:bg-sage-100 transition-colors shadow-sm"
          >
            <Smartphone className="h-4 w-4 text-sage-600" />
            <span>Pasang App Admin di HP</span>
          </button>
        )}

        <div className="px-2.5 py-2 rounded-xl bg-white border border-slate-200/80 shadow-sm">
          <p className="truncate text-xs font-bold text-slate-900">{user.name}</p>
          <p className="truncate text-[11px] text-slate-500">{user.email}</p>
          <span className="mt-1 inline-block rounded-md bg-sage-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sage-700 border border-sage-200">
            {user.role}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Keluar dari Admin
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col">
        {sidebar}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">
            <button
              className="absolute right-3 top-3 text-white p-1 rounded-lg bg-white/10"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md md:px-6">
          <button
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-sage-800 bg-sage-50 px-3 py-1.5 rounded-lg border border-sage-200/80">
            <Sparkles className="h-3.5 w-3.5 text-sage-600" />
            <span>Pondok Tahfizh Plus Abu Dzar • Rumpin, Bogor</span>
          </div>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallApp}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-sage-200 bg-sage-50 px-2.5 py-1.5 text-xs font-bold text-sage-800 hover:bg-sage-100 transition-colors"
                title="Pasang aplikasi admin langsung ke layar utama HP / desktop"
              >
                <Smartphone className="h-3.5 w-3.5 text-sage-600" />
                <span>Pasang App Admin</span>
              </button>
            )}

            <Link
              href="/"
              target="_blank"
              aria-label="Buka web publik"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors sm:px-3"
            >
              <span className="hidden sm:inline">Web Publik</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>

            <Link
              href="/tv"
              target="_blank"
              aria-label="Buka layar TV"
              className="flex items-center gap-1.5 rounded-lg bg-sage-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sage-700 active:scale-95 transition-all sm:px-3.5"
            >
              <MonitorPlay className="h-3.5 w-3.5 text-sage-200" />
              <span className="hidden sm:inline">Buka Layar TV</span>
            </Link>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-7xl mx-auto">{children}</main>
      </div>

      {/* Install Admin Guide Modal */}
      {showInstallGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowInstallGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-600 text-white shadow-sm">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Pasang Aplikasi Khusus Admin
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ikon langsung membuka Panel Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700">
              <div className="rounded-xl bg-sage-50 border border-sage-200/80 p-3 text-sage-900">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-sage-600" />
                  <span>Aplikasi Terpisah dari Web Jamaah</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                  Dengan memasang aplikasi ini dari halaman Admin / Login, ikon di layar utama HP Anda akan dinamai <strong>&quot;Admin DKM&quot;</strong> dan otomatis membuka panel admin secara mandiri tanpa membuka dashboard umum jamaah.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900 shrink-0">🤖 Android (Chrome):</span>
                  <span>Ketuk menu titik tiga <strong>⋮</strong> di pojok kanan atas browser → Pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Instal Aplikasi&quot;</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-900 shrink-0">🍏 iPhone (Safari):</span>
                  <span>Ketuk ikon <strong>Bagikan</strong> <Share2 className="inline h-3.5 w-3.5 text-slate-800" /> di bar bawah Safari → Pilih <strong>&quot;Tambah ke Layar Utama&quot;</strong> (Add to Home Screen).</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="rounded-xl bg-sage-600 px-4 py-2 text-xs font-bold text-white hover:bg-sage-700 active:scale-95 transition-all shadow-sm"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
