"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  Lock,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  ShieldCheck,
} from "lucide-react";

function LoginForm() {
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

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
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kendala koneksi ke server");
    } finally {
      setLoading(false);
    }
  };

  if (status === "authenticated") {
    return (
      <div suppressHydrationWarning className="relative flex min-h-dvh items-center justify-center bg-white p-4 text-center">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-600 text-white text-2xl shadow-md">
            🕌
          </div>
          <p className="text-sm font-bold text-slate-900">Sesi Anda Masih Aktif</p>
          <p className="mt-1 text-xs text-sage-700">Mengalihkan langsung ke Panel Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-50/60 px-4 py-12 text-slate-900 bg-islamic-pattern">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-sage-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-sage-600/10 blur-3xl" />

      <div suppressHydrationWarning className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl sm:p-10">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2d946e] text-white text-3xl shadow-sm">
            🕌
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Masjid Pondok Tahfizh Plus Abu Dzar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Email Administrator
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-sage-600" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nama@abudzar.sch.id"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sage-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-sage-600" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sage-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 transition-colors"
                title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl bg-sage-600 py-3 px-4 font-bold text-white shadow-sm hover:bg-sage-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Panel Admin"}
          </button>
        </form>

        {/* PWA Dedicated Admin Install Card */}
        <div className="mt-6 rounded-2xl border border-sage-200/80 bg-sage-50/60 p-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-600 text-white shadow-sm">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <span>Pasang Aplikasi Admin</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-sage-600" />
                </p>
                <p className="text-[11px] text-slate-600">
                  Membuka langsung Panel Admin (bukan dashboard jamaah)
                </p>
              </div>
            </div>

            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallAdminApp}
                className="inline-flex items-center gap-1 rounded-xl bg-sage-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sage-700 active:scale-95 transition-all shrink-0 animate-pulse"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Instal</span>
              </button>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-sage-200/60 text-[11px] text-slate-600 space-y-1">
            {isStandalone ? (
              <div className="flex items-center gap-1.5 text-sage-800 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-sage-600" />
                <span>Aplikasi Admin telah aktif dalam mode layar penuh HP.</span>
              </div>
            ) : (
              <>
                <p>
                  <strong className="text-slate-800">🤖 Android:</strong> Ketuk menu titik tiga <strong>⋮</strong> di Chrome → <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Instal Aplikasi&quot;</strong>.
                </p>
                <p>
                  <strong className="text-slate-800">🍏 iPhone:</strong> Ketuk tombol <strong>Bagikan</strong> <Share2 className="inline h-3 w-3 text-slate-700" /> di Safari → <strong>&quot;Tambah ke Layar Utama&quot;</strong>.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Beranda Publik</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div suppressHydrationWarning className="min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
