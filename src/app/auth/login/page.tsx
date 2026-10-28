"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Suspense } from "react";
import { Lock, Mail, ArrowLeft, KeyRound } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Email atau password tidak sesuai");
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

  const autofillDemo = () => {
    setEmail("admin@masjidabudzar.com");
    setPassword("admin123");
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white bg-islamic-pattern">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 sm:p-10">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-3xl shadow-xl ring-2 ring-emerald-400/30">
            🕌
          </div>
          <div className="font-arabic text-xl font-bold text-amber-300 drop-shadow mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Masjid Pondok Tahfizh Plus Abu Dzar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Email Administrator
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@masjidabudzar.com"
                className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 px-4 font-bold text-white shadow-lg shadow-emerald-950/50 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Panel Admin"}
          </button>
        </form>

        {/* Quick autofill helper for convenience */}
        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-center">
          <p className="text-[11px] text-slate-400 mb-1.5">
            Akun bawaan default:
          </p>
          <button
            type="button"
            onClick={autofillDemo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
          >
            <KeyRound className="h-3 w-3" />
            <span>Isi admin@masjidabudzar.com</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
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
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginForm />
    </Suspense>
  );
}
