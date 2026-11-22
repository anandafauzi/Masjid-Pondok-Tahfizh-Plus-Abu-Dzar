"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Gagal merender halaman:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f2] px-4 py-12 text-[#19261f]">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
          ⚠️
        </div>
        <h1 className="mt-5 text-xl font-black tracking-tight text-slate-900">
          Terjadi kendala saat memuat halaman
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Maaf, halaman ini belum bisa ditampilkan. Silakan coba lagi; jika kendala
          berlanjut, muat ulang halaman atau hubungi pengurus masjid.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-slate-400">
            Kode galat: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-full rounded-xl bg-sage-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-sage-700 active:scale-[0.98]"
        >
          Coba Lagi
        </button>
      </div>
    </main>
  );
}
