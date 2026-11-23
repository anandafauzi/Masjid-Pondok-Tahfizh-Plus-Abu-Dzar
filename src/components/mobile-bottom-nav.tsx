"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  CalendarDays,
  Compass,
  Ellipsis,
  HandCoins,
  Home,
  Timer,
  Users,
  X,
} from "lucide-react";

const TABS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/jadwal-shalat", label: "Jadwal Sholat", icon: CalendarDays },
  { href: "/jadwal-imam", label: "Imam & Muadzin", icon: Users },
  { href: "/jadwal-jumat", label: "Khatib Jum'at", icon: BookOpen },
] as const;

const MORE_LINKS = [
  { href: "/kiblat", label: "Arah Kiblat", icon: Compass, desc: "Kompas menuju Ka'bah" },
  { href: "/kajian", label: "Kajian", icon: BookMarked, desc: "Agenda kajian masjid" },
  { href: "/donasi", label: "Donasi", icon: HandCoins, desc: "Transfer & QR donasi masjid" },
  { href: "/adzan-iqamah", label: "Adzan–Iqamah", icon: Timer, desc: "Hitung mundur iqamah" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isMoreActive = MORE_LINKS.some((item) => item.href === pathname);

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-gradient-to-br from-[#0b241a] via-[#103d2e] to-[#0a2018] text-white shadow-[0_-12px_40px_rgba(4,25,17,0.28)]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
      >
        <div className="mx-auto flex max-w-7xl items-stretch justify-between gap-1 px-2 pt-2 sm:px-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.href === "/" ? pathname === "/" : pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                data-nav={tab.label}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
                  active
                    ? "bg-gradient-to-br from-[#2d946e] to-[#1e6149] text-white shadow-lg shadow-emerald-950/30 ring-1 ring-white/15"
                    : "text-emerald-50/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${active ? "text-amber-200" : "text-emerald-300/80"}`} />
                <span className="mt-1 w-full truncate text-[9px] font-bold leading-tight sm:text-[10px]">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-more-sheet"
            data-nav="Lainnya"
            className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 ${
              isMoreActive || open
                ? "bg-white/10 text-white ring-1 ring-white/15"
                : "text-emerald-50/65 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Ellipsis className={`h-[18px] w-[18px] ${isMoreActive || open ? "text-amber-200" : "text-emerald-300/80"}`} />
            <span className="mt-1 w-full truncate text-[9px] font-bold leading-tight sm:text-[10px]">
              Lainnya
            </span>
          </button>
        </div>
      </nav>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu lainnya"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#04140d]/65 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            id="mobile-more-sheet"
            className="w-full max-w-2xl rounded-t-[30px] border-t border-white/10 bg-[#faf7f2] p-5 text-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#557a64]">
                  Navigasi
                </p>
                <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-900">
                  Menu Lainnya
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu lainnya"
                className="rounded-2xl bg-white p-2 text-slate-500 shadow-sm transition-colors hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {MORE_LINKS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex flex-col items-start gap-2 rounded-2xl border p-4 transition-all ${
                      active
                        ? "border-[#2d946e] bg-emerald-50 ring-1 ring-[#2d946e]/30"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-[#b0c7b7] hover:shadow-md"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e6149] text-white shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">{item.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
