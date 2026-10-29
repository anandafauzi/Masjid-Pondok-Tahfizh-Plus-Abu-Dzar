"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Lock, Mail, ArrowLeft, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-600 text-white text-3xl shadow-sm">
            🕌
          </div>
          <div className="font-arabic text-xl font-bold text-sage-800 mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
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

        <div className="mt-8 text-center border-t border-slate-100 pt-4">
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
