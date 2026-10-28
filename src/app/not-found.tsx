import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf7f2] bg-islamic-pattern px-4 py-16 text-center text-[#19261f]">
      <div className="relative max-w-md rounded-3xl border border-[#ded5c4] bg-white/95 p-8 shadow-xl sm:p-10">
        <span className="text-5xl">🕌</span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-[#19261f]">
          404 - Halaman Tidak Ditemukan
        </h1>
        <p className="mt-2 text-sm text-[#5c6e63]">
          Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2d946e] to-[#206f52] px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-[#35a87e] hover:to-[#267f5e] transition-all"
          >
            <Home className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

