import { MASJID_INFO } from "@/utils/constants";
import { formatDateOnlyLong, todayDateOnly } from "@/lib/datetime";

interface PrintLetterheadProps {
  title: string;
  subtitle?: string;
  period?: string;
  mosqueName?: string;
  mosqueAddress?: string | null;
}

export function PrintLetterhead({
  title,
  subtitle,
  period,
  mosqueName = MASJID_INFO.name,
  mosqueAddress = MASJID_INFO.address,
}: PrintLetterheadProps) {
  const today = todayDateOnly();
  const printDateStr = formatDateOnlyLong(today);

  return (
    <div className="hidden print:block w-full text-black mb-6">
      {/* Arabic Basmalah */}
      <div className="text-center mb-1">
        <span className="font-arabic text-lg font-bold tracking-widest text-slate-800">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </span>
      </div>

      {/* Mosque Kop Surat Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-black bg-slate-100 text-3xl font-bold">
            🕌
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-700">
              Dewan Kemakmuran Masjid (DKM)
            </p>
            <h1 className="text-xl font-black uppercase tracking-tight text-black">
              {mosqueName}
            </h1>
            <p className="text-[10px] text-slate-600">
              {mosqueAddress ?? "Rumpin, Kabupaten Bogor, Jawa Barat"} • Informasi &amp; Layanan Ibadah
            </p>
          </div>
        </div>

        <div className="text-right text-[10px] text-slate-600 font-mono">
          <p className="font-bold text-black">DOKUMEN RESMI DKM</p>
          <p>Tgl Cetak: {printDateStr}</p>
          <p>Zona: WIB (UTC+7)</p>
        </div>
      </div>

      {/* Decorative Sub-divider */}
      <div className="h-[1.5px] bg-black mt-0.5 mb-4" />

      {/* Document Title Banner */}
      <div className="text-center my-3">
        <h2 className="text-base font-extrabold uppercase tracking-wide text-black underline underline-offset-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs font-medium text-slate-700 mt-1">
            {subtitle}
          </p>
        )}
        {period && (
          <p className="text-xs font-semibold text-slate-800 mt-0.5">
            {period}
          </p>
        )}
      </div>
    </div>
  );
}

export function PrintSignatureBlock({
  leftTitle = "Koordinator Ibadah & Dakwah",
  leftName = "Ust. Penanggung Jawab",
  rightTitle = "Ketua DKM Masjid Abu Dzar",
  rightName = "Ketua Takmir",
  city = "Bogor",
}: {
  leftTitle?: string;
  leftName?: string;
  rightTitle?: string;
  rightName?: string;
  city?: string;
}) {
  const today = todayDateOnly();
  const printDateStr = formatDateOnlyLong(today);

  return (
    <div className="hidden print:block mt-8 pt-4 border-t border-slate-300 text-black text-xs print-avoid-break">
      <div className="flex items-start justify-between px-6">
        {/* Left Signature */}
        <div className="text-center w-60">
          <p className="font-semibold text-slate-700">{leftTitle}</p>
          <div className="h-20" />
          <p className="font-bold border-b border-black inline-block min-w-[160px] pb-0.5">
            ( {leftName} )
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">NIP / ID Petugas DKM</p>
        </div>

        {/* Right Signature */}
        <div className="text-center w-60">
          <p className="text-slate-600">{city}, {printDateStr}</p>
          <p className="font-semibold text-slate-700 mt-0.5">{rightTitle}</p>
          <div className="h-20" />
          <p className="font-bold border-b border-black inline-block min-w-[160px] pb-0.5">
            ( {rightName} )
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Ketua DKM &amp; Pengurus</p>
        </div>
      </div>

      {/* Tiny Document Footer */}
      <div className="mt-6 flex items-center justify-between text-[9px] text-slate-500 font-mono border-t border-slate-200 pt-2">
        <span>Sistem Informasi Manajemen Masjid Digital Abu Dzar • Dokumen Sah Publikasi DKM</span>
        <span>Halaman Cetak A4 Standar</span>
      </div>
    </div>
  );
}

