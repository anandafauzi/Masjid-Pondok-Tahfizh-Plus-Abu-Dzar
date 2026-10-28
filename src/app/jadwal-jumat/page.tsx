import { PublicShell } from "@/components/public-shell";
import {
  getImamRollingActive,
  getKhatibRollingActive,
  getUpcomingKhatibSchedules,
  nextFriday,
} from "@/lib/schedule-data";
import { resolveRolling } from "@/lib/rolling";
import { getMosqueSettings } from "@/lib/settings";
import {
  addDaysUTC,
  dateOnlyToString,
  formatDateOnlyLong,
  todayDateOnly,
} from "@/lib/datetime";
import { BookOpen, UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JadwalJumatPage() {
  const today = todayDateOnly();
  const firstFriday = nextFriday(today);

  const [rollingKhatib, rollingImam, schedules, mosque] = await Promise.all([
    getKhatibRollingActive(),
    getImamRollingActive(),
    getUpcomingKhatibSchedules(firstFriday, 12),
    getMosqueSettings(),
  ]);

  const fridays = Array.from({ length: 6 }, (_, i) =>
    addDaysUTC(firstFriday, i * 7)
  );

  const rows = fridays.map((friday) => {
    const key = dateOnlyToString(friday);
    const schedule = schedules.find((s) => dateOnlyToString(s.fridayDate) === key);

    const khatib = resolveRolling(
      rollingKhatib.map((r) => ({
        id: r.id,
        khatibName: r.khatibName,
        sequenceNumber: r.sequenceNumber,
        effectiveFrom: r.effectiveFrom,
        effectiveUntil: r.effectiveUntil,
        isActive: r.isActive,
        createdAt: r.createdAt,
      })),
      friday
    );

    const imam = resolveRolling(
      rollingImam.map((r) => ({
        id: r.id,
        imamName: r.imamName,
        sequenceNumber: r.sequenceNumber,
        effectiveFrom: r.effectiveFrom,
        effectiveUntil: r.effectiveUntil,
        isActive: r.isActive,
        createdAt: r.createdAt,
      })),
      friday
    );

    return {
      friday,
      khatibName: schedule?.khatibName ?? khatib?.name ?? "Ust. Dr. Hasan Basri, Lc., M.A.",
      sermonTopic: schedule?.sermonTopic ?? null,
      imamSubuh: imam?.name ?? "Ust. Ahmad Fauzi",
    };
  });

  return (
    <PublicShell
      mosque={{
        name: mosque.mosqueName,
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
    >
      {/* Header Banner */}
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-8 text-white shadow-xl ring-1 ring-white/10 sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30 mb-3">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Khutbah &amp; Shalat Jumat Berjamaah</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Jadwal Khatib Jumat
            </h1>
            <p className="mt-2 text-xs text-slate-300 sm:text-sm">
              Daftar asatidzah penceramah khutbah dan imam Subuh Jumat berbasis rotasi berkala di {mosque.mosqueName}.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur text-right">
            <span className="text-xs text-slate-400 block">Jumat Terdekat</span>
            <span className="text-sm font-bold text-amber-300">
              {formatDateOnlyLong(firstFriday)}
            </span>
          </div>
        </div>
      </div>

      {/* Friday Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {rows.map((row, index) => {
          const isClosest = index === 0;

          return (
            <article
              key={index}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-md ${
                isClosest
                  ? "border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 ring-2 ring-amber-400/20"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    isClosest
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isClosest ? "Jumat Pekan Ini" : `Jumat Ke-${index + 1}`}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {formatDateOnlyLong(row.friday)}
                </span>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-slate-400">
                  Khatib Jumat
                </span>
                <h3 className="mt-0.5 text-2xl font-bold text-slate-900">
                  {row.khatibName}
                </h3>

                {row.sermonTopic ? (
                  <p className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">Tema Khutbah: </span>
                    “{row.sermonTopic}”
                  </p>
                ) : (
                  <p className="mt-2 text-xs italic text-slate-400">
                    Tema khutbah akan ditentukan oleh khatib bersangkutan.
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-500">Imam Subuh Jumat:</span>
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  <span>{row.imamSubuh}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </PublicShell>
  );
}
