import { CalendarClock, Timer } from "lucide-react";
import { Card, PageHeader, SectionHeading } from "@/components/ui";
import { getIqamahSettings, getMosqueSettings } from "@/lib/settings";
import { calculatePrayerTimes } from "@/lib/prayer-times";
import { computeIqamahEvents } from "@/lib/iqamah";
import {
  addDaysUTC,
  formatDateOnlyLong,
  formatDateOnlyShort,
  todayDateOnly,
} from "@/lib/datetime";
import { PRAYER_NAMES, PRAYER_NAMES_ARABIC } from "@/utils/constants";

export const dynamic = "force-dynamic";

const ROWS = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

export default async function AdminPrayerTimesPage() {
  const mosque = await getMosqueSettings();
  const iqamahSettings = await getIqamahSettings();
  const today = todayDateOnly();

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDaysUTC(today, i);
    return {
      date,
      times: calculatePrayerTimes(date, {
        method: mosque.prayerCalculationMethod,
        asrMethod: mosque.asrMethod,
        adjustments: mosque.prayerAdjustments,
        latitude: mosque.latitude,
        longitude: mosque.longitude,
      }),
    };
  });

  const todayIqamah = computeIqamahEvents(today, days[0].times, iqamahSettings);

  return (
    <div>
      <PageHeader
        icon={CalendarClock}
        title="Jadwal Shalat"
        description="Dihitung otomatis dari koordinat masjid. Ubah metode di Pengaturan Masjid."
        action={
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            {mosque.prayerCalculationMethod} • WIB
          </span>
        }
      />

      <Card className="mb-6">
        <SectionHeading
          icon={Timer}
          title={`Iqamah Hari Ini — ${formatDateOnlyLong(today)}`}
          description="Estimasi waktu iqamah berdasarkan pengaturan jeda adzan."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {todayIqamah.map((e) => (
            <div
              key={e.key}
              className="group rounded-xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/40 p-3.5 text-center shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <p className="font-arabic text-xs text-amber-600/80">
                {PRAYER_NAMES_ARABIC[e.key as keyof typeof PRAYER_NAMES_ARABIC] ?? ""}
              </p>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                {e.label}
              </p>
              <p className="mt-1 font-mono text-xl font-black text-slate-900">
                {e.adhanTime}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-100/70 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                <Timer className="h-3 w-3" />
                {e.iqamahTime}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading
          icon={CalendarClock}
          title="Tabel Waktu Shalat 14 Hari"
          description="Menampilkan waktu Imsak, Terbit, dan shalat fardhu lima waktu."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#ded5c4] bg-[#f4eee2] text-xs font-bold text-[#19261f]">
                <th className="rounded-l-xl px-4 py-3">Tanggal</th>
                {ROWS.map((key) => (
                  <th key={key} className="px-3 py-3 text-center">
                    <div>{PRAYER_NAMES[key]}</div>
                    <div className="font-arabic text-[10px] font-normal text-amber-300">
                      {PRAYER_NAMES_ARABIC[key]}
                    </div>
                  </th>
                ))}
                <th className="rounded-r-xl px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {days.map(({ date, times }, index) => (
                <tr
                  key={index}
                  className={
                    index === 0
                      ? "bg-emerald-50/70"
                      : "transition-colors hover:bg-slate-50/80"
                  }
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {index === 0 ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Hari Ini
                        </span>
                        <span>{formatDateOnlyShort(date)}</span>
                      </span>
                    ) : (
                      formatDateOnlyShort(date)
                    )}
                  </td>
                  {ROWS.map((key) => (
                    <td
                      key={key}
                      className={`px-3 py-3 text-center font-mono ${
                        index === 0
                          ? "font-bold text-emerald-900"
                          : "text-slate-700"
                      }`}
                    >
                      {times[key]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    {index === 0 ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Mendatang
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
