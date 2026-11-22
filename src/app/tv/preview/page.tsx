"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TvDisplay } from "@/app/tv/TvDisplay";
import type { TvData } from "@/lib/public-data";
import {
  DEFAULT_TV_PREVIEW_CONFIG,
  TV_PREVIEW_PHASES,
  TV_PREVIEW_STORAGE_KEY,
  buildPreviewTvData,
  readTvPreviewConfig,
  writeTvPreviewConfig,
  type TvPreviewConfig,
  type TvPreviewPhase,
} from "@/lib/tv-preview";

export default function TvPreviewPage() {
  const [config, setConfig] = useState<TvPreviewConfig>(DEFAULT_TV_PREVIEW_CONFIG);
  const [base, setBase] = useState<TvData | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setConfig(readTvPreviewConfig() ?? DEFAULT_TV_PREVIEW_CONFIG);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === TV_PREVIEW_STORAGE_KEY) {
        setConfig(readTvPreviewConfig() ?? DEFAULT_TV_PREVIEW_CONFIG);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/tv-data", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Gagal memuat data TV");
        return (await response.json()) as TvData;
      })
      .then((data) => {
        if (!cancelled) setBase(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Bekukan waktu saat phase dipilih agar pratinjau tidak berubah sendiri.
  const [frozenAt, setFrozenAt] = useState(() => Date.now());

  const previewData = useMemo(
    () => (base ? buildPreviewTvData(base, config, frozenAt) : null),
    [base, config, frozenAt],
  );

  const setPhase = useCallback(
    (phase: TvPreviewPhase) => {
      const next: TvPreviewConfig = {
        ...(readTvPreviewConfig() ?? config),
        phase,
        updatedAt: Date.now(),
      };
      writeTvPreviewConfig(next);
      setFrozenAt(Date.now());
      setConfig(next);
    },
    [config],
  );

  return (
    <main className="relative h-dvh overflow-hidden bg-[#08130e]">
      {previewData ? (
        <TvDisplay initialData={previewData} previewMode />
      ) : (
        <div className="flex h-dvh items-center justify-center overflow-hidden px-6 text-center text-white">
          <div>
            <p className="text-2xl font-bold">
              {loadError ? "Gagal memuat data TV" : "Memuat pratinjau layar..."}
            </p>
            <p className="mt-2 text-sm text-white/60">
              {loadError
                ? "Periksa koneksi lalu muat ulang halaman ini."
                : "Menyiapkan tampilan sesuai pengaturan admin."}
            </p>
          </div>
        </div>
      )}

      <aside className="no-scrollbar fixed left-1/2 top-3 z-[100] flex max-w-[95vw] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-2xl border border-white/15 bg-[#0c1f16]/95 px-3 py-2 text-white shadow-2xl backdrop-blur-md">
        <span className="shrink-0 rounded-lg bg-amber-400/15 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
          Pratinjau
        </span>
        <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-bold text-white/80">
          Durasi {config.form.themeSettings?.shalatScreenDurationMinutes ?? 15} menit
        </span>
        {TV_PREVIEW_PHASES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPhase(item.id)}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
              config.phase === item.id
                ? "bg-[#3eb489] text-[#08130e]"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
        <Link
          href="/admin/tv"
          className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          Admin
        </Link>
      </aside>
    </main>
  );
}
