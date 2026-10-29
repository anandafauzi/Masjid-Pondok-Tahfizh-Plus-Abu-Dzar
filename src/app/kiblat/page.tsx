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
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
    >
      {/* Page Header */}
      <div className="mb-8 rounded-3xl border border-[#ded5c4] bg-gradient-to-r from-[#fdfbf7] via-[#f7f3ea] to-[#f1eae0] p-6 text-[#19261f] shadow-lg sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2d946e]/10 px-3.5 py-1 text-xs font-semibold text-[#1e6149] border border-[#2d946e]/25 mb-3">
              <Compass className="h-3.5 w-3.5 text-[#8a6820]" />
              <span>Penunjuk Kiblat Presisi</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#19261f] sm:text-4xl">
              Kompas Arah Kiblat Digital
            </h1>
            <p className="mt-2 text-xs text-[#5c6e63] sm:text-sm max-w-2xl">
              Temukan arah kiblat akurat menuju Ka&apos;bah di Makkah al-Mukarramah langsung melalui sensor giroskop dan kompas digital handphone Anda.
            </p>
          </div>

          <div className="rounded-2xl border border-[#ded5c4] bg-white p-4 shadow-sm text-right shrink-0">
            <span className="text-xs text-[#7c6630] font-semibold block">Arah Kiblat Masjid</span>
            <span className="text-base font-bold text-[#2d946e]">
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

