import { PublicShell } from "@/components/public-shell";
import { EmptyState } from "@/components/ui";
import { getImamSchedulesBetween, getImamRollingActive, nextFriday } from "@/lib/schedule-data";
import { getMosqueSettings } from "@/lib/settings";
import { resolveRolling } from "@/lib/rolling";
import {
  addDaysUTC,
  dateOnlyToString,
  formatDateOnlyLong,
  todayDateOnly,
} from "@/lib/datetime";
import { Users, Sparkles, UserCheck, Mic } from "lucide-react";
import { PRAYER_NAMES_ARABIC } from "@/utils/constants";

export const dynamic = "force-dynamic";

export default async function JadwalImamPage() {
  const today = todayDateOnly();
  const until = addDaysUTC(today, 13);

  const [schedules, rolling, mosque] = await Promise.all([
    getImamSchedulesBetween(today, until),
    getImamRollingActive(),
    getMosqueSettings(),
  ]);

  const grouped = new Map<string, typeof schedules>();
  for (const schedule of schedules) {
    const key = dateOnlyToString(schedule.scheduleDate);
    const list = grouped.get(key) ?? [];
    list.push(schedule);
    grouped.set(key, list);
  }

  const friday = nextFriday(today);
  const rollingImam = resolveRolling(
    rolling.map((r) => ({
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

  const dates = Array.from(grouped.keys()).sort();
  const todayKey = dateOnlyToString(today);

  return (
    <PublicShell
      mosque={{
        name: mosque.mosqueName,
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
    >
      {/* Page Header */}
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-8 text-white shadow-xl ring-1 ring-white/10 sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 mb-3">
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span>Petugas Ibadah Shalat Fardhu</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Jadwal Imam &amp; Muadzin
            </h1>
            <p className="mt-2 text-xs text-slate-300 sm:text-sm">
              Jadwal penugasan para asatidzah dan santri tahfizh untuk memimpin shalat 5 waktu di {mosque.mosqueName}.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur text-right">
            <span className="text-xs text-slate-400 block">Periode Penugasan</span>
            <span className="text-sm font-bold text-amber-300">
              14 Hari Ke Depan
            </span>
          </div>
        </div>
      </div>

      {/* Imam Subuh Jumat Spotlight */}
      {rollingImam && (
        <section className="mb-8 rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 border border-amber-500/20">
              <Sparkles className="h-3 w-3 text-amber-600" />
              Imam Subuh Jumat Pekan Ini
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Rotasi {rollingImam.index + 1} dari {rollingImam.total}
            </span>
          </div>

          <div className="mt-3">
            <h2 className="text-2xl font-bold text-slate-900">
              {rollingImam.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Bertugas memimpin shalat Subuh berjamaah pada {formatDateOnlyLong(friday)}
            </p>
          </div>
        </section>
      )}

      {/* Schedule Lists */}
      {dates.length === 0 ? (
        <EmptyState message="Belum ada data penugasan imam & muadzin pada sistem." />
      ) : (
        <div className="space-y-6">
          {dates.map((key) => {
            const list = grouped.get(key) ?? [];
            const isToday = key === todayKey;
            const dateObj = new Date(key + "T00:00:00.000Z");

            return (
              <section
                key={key}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${
                  isToday
                    ? "border-emerald-400 ring-2 ring-emerald-400/20 shadow-md"
                    : "border-slate-200"
                }`}
              >
                <div
                  className={`px-6 py-3.5 flex items-center justify-between border-b ${
                    isToday
                      ? "bg-emerald-900 text-white"
                      : "bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-sm sm:text-base">
                      {formatDateOnlyLong(dateObj)}
                    </h3>
                    {isToday && (
                      <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase shadow-sm">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <span className="text-xs opacity-75">
                    {list.length} Waktu Terjadwal
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[500px]">
                    <thead className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3">Waktu Shalat</th>
                        <th className="px-6 py-3">Imam</th>
                        <th className="px-6 py-3">Muadzin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {list.map((s) => (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                            <span className="font-arabic text-xs text-amber-700/80">
                              {PRAYER_NAMES_ARABIC[s.prayerName.toLowerCase() as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                            </span>
                            <span>{s.prayerName}</span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-800 font-medium">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-4 w-4 text-emerald-600" />
                              <span>{s.imamName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Mic className="h-3.5 w-3.5 text-blue-500" />
                              <span>{s.muadzinName}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PublicShell>
  );
}
