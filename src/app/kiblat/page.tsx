import { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { QiblaCompass } from "@/components/qibla-compass";
import { getMosqueSettings } from "@/lib/settings";
import { Compass } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kompas Arah Kiblat Digital - Masjid Pondok Tahfizh Plus Abu Dzar",
  description:
    "Penunjuk arah kiblat presisi online berbasis giroskop sensor HP dan perhitungan koordinat bola bumi menuju Ka'bah di Makkah al-Mukarramah.",
};

export default async function KiblatPage() {
  const mosque = await getMosqueSettings();

  return (
    <PublicShell
      mosque={{
        name: mosque.mosqueName,
        logoUrl: mosque.logoUrl,
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
    >
      {/* Page Header */}
      <div className="mb-8 rounded-3xl border border-slate-200/80 bg-white p-6 text-slate-800 shadow-sm sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f7f5] px-3.5 py-1 text-xs font-semibold text-[#466553] border border-[#d2dfd6] mb-3">
              <Compass className="h-3.5 w-3.5 text-[#557a64]" />
              <span>Penunjuk Kiblat Presisi</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Kompas Arah Kiblat Digital
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm max-w-2xl">
              Temukan arah kiblat akurat menuju Ka&apos;bah di Makkah al-Mukarramah langsung melalui sensor giroskop dan kompas digital handphone Anda.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-[#fbfdfc] p-4 shadow-sm text-right shrink-0">
            <span className="text-xs text-slate-500 font-semibold block">Arah Kiblat Masjid</span>
            <span className="text-base font-bold text-[#466553]">
              295.28° Barat Laut
            </span>
          </div>
        </div>
      </div>

      {/* Main Qibla Compass Interactive Component */}
      <QiblaCompass
        defaultLat={mosque.latitude}
        defaultLng={mosque.longitude}
        mosqueName={mosque.mosqueName}
        mosqueAddress={mosque.address}
      />
    </PublicShell>
  );
}

