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
      <div className="mb-8 rounded-3xl border border-[#ded5c4] bg-gradient-to-r from-[#fdfbf7] via-[#f7f3ea] to-[#f1eae0] p-8 text-[#19261f] shadow-lg sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2d946e]/10 px-3.5 py-1 text-xs font-semibold text-[#1e6149] border border-[#2d946e]/25 mb-3">
              <BookMarked className="h-3.5 w-3.5 text-[#8a6820]" />
              <span>Majelis Ilmu &amp; Pembahasan Kitab</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#19261f] sm:text-4xl">
              Agenda Kajian Islam
            </h1>
            <p className="mt-2 text-xs text-[#5c6e63] sm:text-sm">
              Program kajian rutin tafsir, hadits, dan akidah terbuka untuk seluruh jamaah ikhwan &amp; akhwat di {mosque.mosqueName}.
            </p>
          </div>

          <div className="rounded-2xl border border-[#ded5c4] bg-white p-4 shadow-sm text-right">
            <span className="text-xs text-[#7c6630] font-semibold block">Status Acara</span>
            <span className="text-sm font-bold text-[#2d946e]">
              Terbuka Untuk Umum
            </span>
          </div>
        </div>
      </div>

      {/* Kajian Cards Grid */}
      {kajian.length === 0 ? (
        <div className="rounded-2xl border border-[#ded5c4] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf6f0] text-2xl text-[#2d946e] mb-3">
            📚
          </div>
          <h3 className="text-lg font-bold text-[#19261f]">
            Kajian Rutin Ba&apos;da Magrib
          </h3>
          <p className="mt-2 text-xs text-[#5a685e] max-w-md mx-auto">
            Kajian rutin pembahasan kitab tafsir dan tahsin diselenggarakan setiap malam di Masjid Abu Dzar. Hubungi takmir masjid untuk konfirmasi tema pekanan.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {kajian.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-[#ded5c4] bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#3eb489]/60 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf6f0] border border-[#bde5d2] px-3 py-0.5 text-xs font-bold text-[#1e6149]">
                    <Sparkles className="h-3 w-3 text-[#2d946e]" />
                    <span>Kajian Rutin</span>
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#5a685e]">
                    <MapPin className="h-3.5 w-3.5 text-[#2d946e]" />
                    <span>{item.location}</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-[#19261f] leading-snug">
                  {item.title}
                </h2>

                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#2c3b31]">
                  <User className="h-4 w-4 text-[#2d946e]" />
                  <span>Pemateri: {item.speakerName}</span>
                </div>

                {item.bookOrTopic && (
                  <p className="mt-2 text-xs text-[#3c4a41] bg-[#fbf9f4] p-2.5 rounded-lg border border-[#ded5c4]">
                    <span className="font-semibold text-[#19261f]">Kitab / Pembahasan: </span>
                    {item.bookOrTopic}
                  </p>
                )}

                {item.description && (
                  <p className="mt-2 text-xs leading-relaxed text-[#5a685e]">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-6 border-t border-[#ded5c4] pt-3 flex items-center justify-between text-xs text-[#5a685e]">
                <div className="flex items-center gap-1.5 font-medium text-[#2c3b31]">
                  <Calendar className="h-3.5 w-3.5 text-[#2d946e]" />
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
