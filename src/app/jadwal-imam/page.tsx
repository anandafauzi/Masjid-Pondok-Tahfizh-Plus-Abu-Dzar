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
      <div className="mb-8 rounded-3xl border border-[#ded5c4] bg-gradient-to-r from-[#fdfbf7] via-[#f7f3ea] to-[#f1eae0] p-8 text-[#19261f] shadow-lg sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#2d946e]/10 px-3.5 py-1 text-xs font-semibold text-[#1e6149] border border-[#2d946e]/25 mb-3">
              <Users className="h-3.5 w-3.5 text-[#8a6820]" />
              <span>Petugas Ibadah Shalat Fardhu</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#19261f] sm:text-4xl">
              Jadwal Imam &amp; Muadzin
            </h1>
            <p className="mt-2 text-xs text-[#5c6e63] sm:text-sm">
              Jadwal penugasan para asatidzah dan santri tahfizh untuk memimpin shalat 5 waktu di {mosque.mosqueName}.
            </p>
          </div>

          <div className="rounded-2xl border border-[#ded5c4] bg-white p-4 shadow-sm text-right">
            <span className="text-xs text-[#7c6630] font-semibold block">Periode Penugasan</span>
            <span className="text-sm font-bold text-[#8a6820]">
              14 Hari Ke Depan
            </span>
          </div>
        </div>
      </div>

      {/* Imam Subuh Jumat Spotlight */}
      {rollingImam && (
        <section className="mb-8 rounded-2xl border border-[#ded3be] bg-gradient-to-br from-[#fdfbf7] via-[#f7f2e5] to-[#f4ebe1] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c5a059]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#82621c] border border-[#c5a059]/30">
              <Sparkles className="h-3 w-3 text-[#c5a059]" />
              Imam Subuh Jumat Pekan Ini
            </span>
            <span className="text-xs font-semibold text-[#6d7c71]">
              Rotasi {rollingImam.index + 1} dari {rollingImam.total}
            </span>
          </div>

          <div className="mt-3">
            <h2 className="text-2xl font-bold text-[#19261f]">
              {rollingImam.name}
            </h2>
            <p className="mt-1 text-xs text-[#5a685e]">
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
                    ? "border-[#3eb489] ring-2 ring-[#3eb489]/20 shadow-md"
                    : "border-[#ded5c4]"
                }`}
              >
                <div
                  className={`px-6 py-3.5 flex items-center justify-between border-b ${
                    isToday
                      ? "bg-[#163a2a] text-white border-[#24523c]"
                      : "bg-[#fbf9f4] text-[#19261f] border-[#ded5c4]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-sm sm:text-base">
                      {formatDateOnlyLong(dateObj)}
                    </h3>
                    {isToday && (
                      <span className="rounded-full bg-[#2d946e] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase shadow-sm">
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
                    <thead className="bg-[#fbf9f4]/60 text-xs font-semibold text-[#5a685e] border-b border-[#ded5c4]">
                      <tr>
                        <th className="px-6 py-3">Waktu Shalat</th>
                        <th className="px-6 py-3">Imam</th>
                        <th className="px-6 py-3">Muadzin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8e0d2]">
                      {list.map((s) => (
                        <tr
                          key={s.id}
                          className="hover:bg-[#faf7f2] transition-colors"
                        >
                          <td className="px-6 py-3.5 font-bold text-[#19261f] flex items-center gap-2">
                            <span className="font-arabic text-xs text-[#8a6820]">
                              {PRAYER_NAMES_ARABIC[s.prayerName.toLowerCase() as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
                            </span>
                            <span>{s.prayerName}</span>
                          </td>
                          <td className="px-6 py-3.5 text-[#2c3b31] font-medium">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="h-4 w-4 text-[#2d946e]" />
                              <span>{s.imamName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-[#5a685e]">
                            <div className="flex items-center gap-1.5">
                              <Mic className="h-3.5 w-3.5 text-[#457c6b]" />
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
