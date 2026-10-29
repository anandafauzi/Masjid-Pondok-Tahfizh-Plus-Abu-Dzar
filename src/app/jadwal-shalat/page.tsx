import { PublicShell } from "@/components/public-shell";
import { ScheduleExportActions } from "@/components/schedule-export-actions";
import { PrintLetterhead, PrintSignatureBlock } from "@/components/print-letterhead";
import {
  getIqamahSettings,
  getMosqueSettings,
} from "@/lib/settings";
import { calculatePrayerTimes } from "@/lib/prayer-times";
import { computeIqamahEvents } from "@/lib/iqamah";
import {
  addDaysUTC,
  formatDateOnlyLong,
  formatDateOnlyShort,
  todayDateOnly,
} from "@/lib/datetime";
import { PRAYER_NAMES, PRAYER_NAMES_ARABIC } from "@/utils/constants";
import { Calendar, Timer, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

const ROWS = ["imsak", "fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_COLS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export default async function JadwalShalatPage() {
  const mosque = await getMosqueSettings();
  const iqamahSettings = await getIqamahSettings();
  const today = todayDateOnly();

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysUTC(today, i);
    const times = calculatePrayerTimes(date, {
      method: mosque.prayerCalculationMethod,
      asrMethod: mosque.asrMethod,
      adjustments: mosque.prayerAdjustments,
      latitude: mosque.latitude,
      longitude: mosque.longitude,
    });
    return { date, times };
  });

  const todayTimes = days[0].times;
  const todayIqamah = computeIqamahEvents(today, todayTimes, iqamahSettings);

  const startDateStr = formatDateOnlyLong(today);
  const endDateStr = formatDateOnlyLong(days[days.length - 1].date);

  return (
    <PublicShell
      mosque={{
        name: mosque.mosqueName,
        address: mosque.address,
        mapUrl: mosque.mapUrl,
      }}
    >
      {/* ========================================================
          PRINT ONLY VIEW (Formatted for Standard A4 Poster Print)
          ======================================================== */}
      <div className="hidden print:block text-black">
        <PrintLetterhead
          title="JADWAL WAKTU SHALAT & IQAMAH SEPEKAN"
          subtitle={`Masjid Pondok Tahfizh Plus Abu Dzar • Metode: ${mosque.prayerCalculationMethod}`}
          period={`Periode: ${startDateStr} s.d. ${endDateStr}`}
          mosqueName={mosque.mosqueName}
          mosqueAddress={mosque.address}
        />

        {/* 7-Days Timetable for Print */}
        <table className="print-table w-full border-collapse border border-black text-black">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-black p-1.5 text-center text-[9pt] w-28">Tanggal</th>
              {ROWS.map((key) => (
                <th key={key} className="border border-black p-1.5 text-center text-[9pt]">
                  <div>{PRAYER_NAMES[key]}</div>
                  <div className="font-arabic text-[8pt] font-normal">
                    {PRAYER_NAMES_ARABIC[key]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(({ date, times }, index) => {
              const isToday = index === 0;
              const isFriday = date.getUTCDay() === 5;
              return (
                <tr
                  key={index}
                  className={`print-avoid-break ${
                    isFriday ? "bg-amber-50/50" : isToday ? "bg-slate-100" : ""
                  }`}
                >
                  <td className="border border-black p-1 text-[8.5pt] font-semibold text-center">
                    <div>{formatDateOnlyShort(date)}</div>
                    {isToday && (
                      <span className="text-[7pt] font-bold text-emerald-800 uppercase block">
                        Hari Ini
                      </span>
                    )}
                    {isFriday && !isToday && (
                      <span className="text-[7pt] font-bold text-amber-800 uppercase block">
                        Jumat
                      </span>
                    )}
                  </td>
                  {ROWS.map((key) => (
                    <td
                      key={key}
                      className="border border-black p-1 text-center font-mono text-[9pt]"
                    >
                      {times[key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Iqamah Rules Section for Print */}
        <div className="mt-4 p-2.5 border border-black rounded text-[8pt] text-black leading-snug bg-slate-50 print-avoid-break">
          <p className="font-bold uppercase tracking-wider text-[8.5pt] mb-1">
            Ketetapan Jeda Waktu Adzan ke Iqamah Masjid Abu Dzar:
          </p>
          <div className="grid grid-cols-5 gap-2 text-center text-[8pt] border-t border-slate-300 pt-2">
            {PRAYER_COLS.map((key) => {
              const setting = iqamahSettings.find(
                (s) => s.prayerName === PRAYER_NAMES[key]
              );
              return (
                <div key={key} className="border border-slate-300 rounded p-1 bg-white">
                  <div className="font-bold">{PRAYER_NAMES[key]}</div>
                  <div className="text-[7.5pt] text-emerald-800 font-semibold">
                    {setting?.mode === "FIXED_TIME" && setting.fixedIqamahTime
                      ? `Pukul ${setting.fixedIqamahTime} WIB`
                      : `${setting?.delayMinutes ?? 15} Menit`}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[7.5pt] text-slate-600 italic">
            * Waktu shalat dihitung otomatis mengacu pada koordinat lintang &amp; bujur Masjid Abu Dzar (Zona WIB / UTC+7).
          </p>
        </div>

        <PrintSignatureBlock />
      </div>

      {/* ========================================================
          WEB SCREEN VIEW (Interactive Luxury UI)
          ======================================================== */}
      <div className="print:hidden">
        {/* Top Page Header */}
        <div className="mb-8 rounded-3xl border border-[#ded5c4] bg-gradient-to-r from-[#fdfbf7] via-[#f7f3ea] to-[#f1eae0] p-6 text-[#19261f] shadow-lg sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2d946e]/10 px-3.5 py-1 text-xs font-semibold text-[#1e6149] border border-[#2d946e]/25 mb-3">
                <Calendar className="h-3.5 w-3.5 text-[#8a6820]" />
                <span>Kalender Jadwal Shalat Digital</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#19261f] sm:text-4xl">
                Jadwal Shalat 7 Hari
              </h1>
              <p className="mt-2 text-xs text-[#5c6e63] sm:text-sm max-w-2xl">
                {mosque.mosqueName} • Dihitung otomatis zona WIB • Metode {mosque.prayerCalculationMethod}
              </p>
            </div>

            {/* Actions: Export PDF & WhatsApp Share */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <ScheduleExportActions
                type="shalat"
                mosqueName={mosque.mosqueName}
                prayerTimesDays={days}
                todayIqamah={todayIqamah}
              />
            </div>
          </div>
        </div>

        {/* Today's Prayers Spotlight Cards */}
        <section className="mb-10 rounded-2xl border border-[#bde5d2] bg-gradient-to-br from-[#f8fdfb] via-[#edf7f3] to-[#e4f3ec] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#2d946e]" />
              <h2 className="text-lg font-bold text-[#19261f]">
                Jadwal Adzan &amp; Iqamah Hari Ini
              </h2>
            </div>
            <span className="text-xs font-bold text-[#1e6149] bg-[#eaf6f0] border border-[#bde5d2] px-2.5 py-0.5 rounded-full">
              WIB (UTC+7)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {todayIqamah.map((e) => {
              const ar = PRAYER_NAMES_ARABIC[e.key as keyof typeof PRAYER_NAMES_ARABIC] ?? "";
              return (
                <div
                  key={e.key}
                  className="group relative overflow-hidden rounded-xl border border-[#ded5c4] bg-white p-4 text-center shadow-sm transition-all hover:border-[#3eb489] hover:shadow-md"
                >
                  <span className="font-arabic text-xs text-[#8a6820] block">
                    {ar}
                  </span>
                  <p className="text-sm font-bold text-[#19261f]">{e.label}</p>
                  <p className="font-mono text-2xl font-black text-[#19261f] mt-1">
                    {e.adhanTime}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#1e6149] bg-[#eaf6f0] py-1 px-2 rounded-lg border border-[#bde5d2]/60">
                    <Timer className="h-3 w-3 text-[#2d946e]" />
                    <span>Iqamah {e.iqamahTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7-Days Timetable Table */}
        <section className="overflow-hidden rounded-2xl border border-[#ded5c4] bg-white shadow-sm">
          <div className="border-b border-[#ded5c4] bg-[#fbf9f4] px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#19261f] text-base">
                Tabel Waktu Shalat Sepekan
              </h3>
              <p className="text-xs text-[#5a685e]">
                Menampilkan waktu Imsak, Terbit, dan Shalat Fardhu 5 Waktu
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#ded5c4] bg-[#f4eee2] text-[#19261f] text-xs font-bold">
                  <th className="px-5 py-3.5">Tanggal</th>
                  {ROWS.map((key) => (
                    <th key={key} className="px-4 py-3.5 text-center">
                      <div>{PRAYER_NAMES[key]}</div>
                      <div className="font-arabic text-[11px] text-[#8a6820] font-normal">
                        {PRAYER_NAMES_ARABIC[key]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e0d2]">
                {days.map(({ date, times }, index) => {
                  const isToday = index === 0;
                  return (
                    <tr
                      key={index}
                      className={`transition-colors ${
                        isToday
                          ? "bg-[#edf7f2] font-semibold text-[#164433]"
                          : "hover:bg-[#faf7f2]"
                      }`}
                    >
                      <td className="px-5 py-4 font-medium">
                        {isToday ? (
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#2d946e] px-2 py-0.5 text-[10px] font-bold text-white uppercase shadow-sm">
                              Hari Ini
                            </span>
                            <span className="text-[#19261f]">{formatDateOnlyShort(date)}</span>
                          </div>
                        ) : (
                          <span className="text-[#3c4a41]">{formatDateOnlyShort(date)}</span>
                        )}
                      </td>
                      {ROWS.map((key) => (
                        <td
                          key={key}
                          className={`px-4 py-4 text-center font-mono text-sm ${
                            isToday ? "font-bold text-[#1a553f]" : "text-[#3c4a41]"
                          }`}
                        >
                          {times[key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Iqamah Settings Explanation */}
        <section className="mt-10 rounded-2xl border border-[#ded5c4] bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#19261f]">
            Ketetapan Jeda Waktu Adzan ke Iqamah
          </h3>
          <p className="mt-1 text-xs text-[#5c6e63]">
            Durasi jeda waktu shalat sunnah qobliyah dan persiapan shaf berjamaah di Masjid Abu Dzar:
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PRAYER_COLS.map((key) => {
              const setting = iqamahSettings.find(
                (s) => s.prayerName === PRAYER_NAMES[key]
              );
              return (
                <div
                  key={key}
                  className="rounded-xl border border-[#ded5c4] bg-[#fbf9f4] p-4 text-center"
                >
                  <span className="font-arabic text-xs text-[#8a6820] block">
                    {PRAYER_NAMES_ARABIC[key]}
                  </span>
                  <p className="font-bold text-[#19261f] text-sm">
                    {PRAYER_NAMES[key]}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#1e6149]">
                    {setting?.mode === "FIXED_TIME" && setting.fixedIqamahTime
                      ? `Pukul ${setting.fixedIqamahTime} WIB`
                      : `${setting?.delayMinutes ?? 15} Menit Setelah Adzan`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
