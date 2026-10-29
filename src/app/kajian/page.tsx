import { PublicShell } from "@/components/public-shell";
import { getUpcomingKajian } from "@/lib/schedule-data";
import { getMosqueSettings } from "@/lib/settings";
import { BookMarked, Calendar, MapPin, User, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export default async function KajianPage() {
  const [kajian, mosque] = await Promise.all([
    getUpcomingKajian(new Date(), 30).catch(() => []),
    getMosqueSettings(),
  ]);

  return (
    <PublicShell
      mosque={{
        name: mosque.mosqueName,
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
    >
      {/* Header Banner */}
      <div className="mb-8 rounded-3xl border border-slate-200/80 bg-white p-6 text-slate-800 shadow-sm sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f7f5] px-3.5 py-1 text-xs font-semibold text-[#466553] border border-[#d2dfd6] mb-3">
              <BookMarked className="h-3.5 w-3.5 text-[#557a64]" />
              <span>Majelis Ilmu &amp; Pembahasan Kitab</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Agenda Kajian Islam
            </h1>
            <p className="mt-2 text-xs text-slate-500 sm:text-sm">
              Program kajian rutin tafsir, hadits, dan akidah terbuka untuk seluruh jamaah ikhwan &amp; akhwat di {mosque.mosqueName}.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-[#fbfdfc] p-4 shadow-sm text-right">
            <span className="text-xs text-slate-500 font-semibold block">Status Acara</span>
            <span className="text-sm font-bold text-[#466553]">
              Terbuka Untuk Umum
            </span>
          </div>
        </div>
      </div>

      {/* Kajian Cards Grid */}
      {kajian.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f7f5] text-2xl text-[#557a64] mb-3">
            📚
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Kajian Rutin Ba&apos;da Magrib
          </h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
            Kajian rutin pembahasan kitab tafsir dan tahsin diselenggarakan setiap malam di Masjid Abu Dzar. Hubungi takmir masjid untuk konfirmasi tema pekanan.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {kajian.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:border-[#b0c7b7] hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7f5] border border-[#d2dfd6] px-3 py-0.5 text-xs font-bold text-[#395243]">
                    <Sparkles className="h-3 w-3 text-[#557a64]" />
                    <span>Kajian Rutin</span>
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-[#557a64]" />
                    <span>{item.location}</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {item.title}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <User className="h-4 w-4 text-[#557a64]" />
                  <span>Pemateri: {item.speakerName}</span>
                </div>

                {item.bookOrTopic && (
                  <p className="mt-2 text-xs text-slate-700 bg-[#f8faf9] p-2.5 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-900">Kitab / Pembahasan: </span>
                    {item.bookOrTopic}
                  </p>
                )}

                {item.description && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-[#557a64]" />
                  <span>{formatDateTime(item.startDateTime.toISOString())}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </PublicShell>
  );
}
