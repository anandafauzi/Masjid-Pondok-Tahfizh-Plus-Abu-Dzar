"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
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
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV.filter(
    (item) => !item.superOnly || user.role === "SUPER_ADMIN"
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-[#fdfbf7] text-[#19261f] border-r border-[#ded5c4] shadow-sm">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#ded5c4] bg-[#f8f4eb]">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#3eb489] to-[#206f52] text-2xl shadow-sm ring-2 ring-[#bde5d2]">
          🕌
        </div>
        <div>
          <p className="text-sm font-extrabold leading-tight text-[#19261f]">
            Masjid Abu Dzar
          </p>
          <p className="text-xs text-[#2d946e] font-semibold">Panel Administrasi</p>
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
                  ? "bg-gradient-to-r from-[#2d946e] to-[#206f52] text-white shadow-sm font-bold"
                  : "text-[#3f5045] hover:bg-[#eaf6f0] hover:text-[#1e6149]"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-[#2d946e]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="border-t border-[#ded5c4] p-3 bg-[#f8f4eb]">
        <div className="mb-2 px-2.5 py-2 rounded-xl bg-white border border-[#ded5c4] shadow-sm">
          <p className="truncate text-xs font-bold text-[#19261f]">{user.name}</p>
          <p className="truncate text-[11px] text-[#607066]">{user.email}</p>
          <span className="mt-1 inline-block rounded-md bg-[#eaf6f0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1e6149] border border-[#bde5d2]">
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
    <div className="min-h-screen bg-[#faf7f2] text-[#19261f]">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col">
        {sidebar}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
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
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#ded5c4] bg-[#faf7f2]/90 px-4 py-3 backdrop-blur-md md:px-6">
          <button
            className="rounded-lg p-2 text-[#2c3b31] hover:bg-[#ede6d8] md:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-[#1e6149] bg-[#eaf6f0] px-3 py-1.5 rounded-lg border border-[#bde5d2]">
            <Sparkles className="h-3.5 w-3.5 text-[#2d946e]" />
            <span>Pondok Tahfizh Plus Abu Dzar • Rumpin, Bogor</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              aria-label="Buka web publik"
              className="flex items-center gap-1.5 rounded-lg border border-[#ded5c4] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2c3b31] hover:bg-[#f6f2e9] transition-colors sm:px-3"
            >
              <span className="hidden sm:inline">Web Publik</span>
              <ExternalLink className="h-3 w-3 text-[#7c9487]" />
            </Link>

            <Link
              href="/tv"
              target="_blank"
              aria-label="Buka layar TV"
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2d946e] to-[#205e48] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-[#35a87e] hover:to-[#266d54] active:scale-95 transition-all sm:px-3.5"
            >
              <MonitorPlay className="h-3.5 w-3.5 text-[#a5e4cb]" />
              <span className="hidden sm:inline">Buka Layar TV</span>
            </Link>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
