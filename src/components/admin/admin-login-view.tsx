"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Lock,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

interface AdminLoginViewProps {
  logoUrl?: string | null;
  mosqueName?: string;
}

export function AdminLoginView({
  logoUrl,
  mosqueName = "Masjid Pondok Tahfizh Plus Abu Dzar",
}: AdminLoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

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
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallAdminApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast.success("Aplikasi Admin berhasil dipasang ke Layar Utama!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      const result = await signIn("credentials", {
        email: cleanEmail,
        password: cleanPassword,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Email atau kata sandi tidak sesuai. Silakan periksa kembali.");
      } else {
        toast.success("Login berhasil! Mengalihkan ke dashboard...");
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kendala koneksi ke server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#faf7f2] px-4 py-12 text-[#19261f]">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#2d946e]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-[#8a6820]/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[#ded5c4] bg-white p-6 shadow-xl sm:p-8 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center">
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b4332] to-[#0e241a] text-2xl text-white shadow-lg ring-4 ring-[#ded5c4]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo Masjid"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <ShieldCheck className="h-8 w-8 text-[#f3d37a]" />
              )}
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1b4332]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1b4332] border border-[#1b4332]/20">
              <ShieldCheck className="h-3.5 w-3.5 text-[#1b4332]" />
              Panel Khusus Pengurus DKM
            </span>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-[#19261f]">
              Admin DKM
            </h1>
            <p className="mt-1 text-xs text-[#5c6e63]">
              {mosqueName}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold uppercase tracking-wider text-[#5c6e63]"
              >
                Email Admin
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="fauzi@abudzar.sch.id"
                  className="w-full rounded-xl border border-[#ded5c4] bg-[#faf7f2]/50 py-2.5 pl-10 pr-4 text-sm text-[#19261f] transition-all placeholder:text-slate-400 focus:border-[#2d946e] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2d946e]/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-[#5c6e63]"
              >
                Kata Sandi
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#ded5c4] bg-[#faf7f2]/50 py-2.5 pl-10 pr-11 text-sm text-[#19261f] transition-all placeholder:text-slate-400 focus:border-[#2d946e] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2d946e]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#19261f]"
                  aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#1b4332] to-[#2d946e] py-3 text-sm font-bold text-white shadow-md transition-all hover:from-[#143225] hover:to-[#24795a] disabled:opacity-50"
            >
              {loading ? "Memverifikasi..." : "Masuk ke Panel Admin"}
            </button>
          </form>

          {/* Tombol Install PWA Khusus Admin */}
          <div className="mt-6 border-t border-[#ded5c4] pt-5">
            {isStandalone ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#eaf6f0] p-3 text-xs font-bold text-[#1e6149] border border-[#2d946e]/30">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2d946e]" />
                <span>Aplikasi Admin DKM aktif di Layar Utama</span>
              </div>
            ) : deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstallAdminApp}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-[#1b4332] bg-[#f4faf7] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#1b4332] shadow-sm transition-all hover:bg-[#1b4332] hover:text-white"
              >
                <Download className="h-4 w-4" />
                <span>Install Aplikasi Admin DKM</span>
              </button>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#ded5c4] bg-[#faf7f2] p-3 text-center">
                <p className="text-[11px] font-semibold text-[#5c6e63]">
                  💡 <strong>Tips:</strong> Klik menu browser (titik 3 di Chrome / tombol Share di Safari) lalu pilih <strong>&quot;Install Aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> untuk memasang aplikasi Admin ini secara mandiri.
                </p>
              </div>
            )}
          </div>

          {/* Footer Back */}
          <div className="mt-5 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5c6e63] hover:text-[#19261f] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali ke Halaman Jamaah</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
