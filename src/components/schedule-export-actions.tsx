"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Printer,
  Copy,
  Check,
  X,
  MessageCircle,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { formatDateOnlyLong, formatDateOnlyShort } from "@/lib/datetime";

export interface ImamScheduleItem {
  id: string;
  scheduleDate: string | Date;
  prayerName: string;
  imamName: string;
  muadzinName: string;
  notes?: string | null;
}

export interface PrayerTimesDay {
  date: string | Date;
  times: Record<string, string>;
}

export interface IqamahEventItem {
  key: string;
  label: string;
  adhanTime: string;
  iqamahTime: string;
}

interface ScheduleExportActionsProps {
  type: "imam" | "shalat";
  mosqueName: string;
  schedules?: ImamScheduleItem[];
  rollingImamName?: string | null;
  prayerTimesDays?: PrayerTimesDay[];
  todayIqamah?: IqamahEventItem[];
  variant?: "public" | "admin";
}

export function ScheduleExportActions({
  type,
  mosqueName,
  schedules = [],
  rollingImamName,
  prayerTimesDays = [],
  todayIqamah = [],
  variant = "public",
}: ScheduleExportActionsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharePeriod, setSharePeriod] = useState<"week" | "today">("week");

  // Generate WhatsApp message text based on selection
  function generateWhatsAppText(): string {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://masjid-pondok-tahfizh-plus-abu-dzar.vercel.app";

    if (type === "imam") {
      if (sharePeriod === "today") {
        // Group today's schedule
        const todayYmd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
        const todayItems = schedules.filter((s) => {
          const sDate = typeof s.scheduleDate === "string" ? s.scheduleDate.slice(0, 10) : new Date(s.scheduleDate).toISOString().slice(0, 10);
          return sDate === todayYmd;
        });

        const dateStr = formatDateOnlyLong(new Date());

        let text = `🕌 *JADWAL IMAM & MUADZIN HARI INI*\n`;
        text += `*${mosqueName}*\n`;
        text += `📅 *${dateStr}*\n\n`;
        text += `السلام عليكم ورحمة الله وبركاته\n`;
        text += `Berikut jadwal penugasan Imam & Muadzin shalat fardhu hari ini:\n\n`;

        if (todayItems.length > 0) {
          const order = ["Subuh", "Zuhur", "Asar", "Magrib", "Isya"];
          todayItems.sort((a, b) => order.indexOf(a.prayerName) - order.indexOf(b.prayerName));
          for (const item of todayItems) {
            text += `• *${item.prayerName}*\n`;
            text += `   - Imam: ${item.imamName || "-"}\n`;
            text += `   - Muadzin: ${item.muadzinName || "-"}\n`;
          }
        } else {
          text += `_(Jadwal hari ini mengikuti penugasan rutin takmir)_\n`;
        }

        text += `\n_Dimohon hadir di masjid 15 menit sebelum adzan._\n`;
        text += `جزاكم الله خيرا\n\n`;
        text += `🌐 *Cek jadwal live & rotasi:* \n${siteUrl}/jadwal-imam`;
        return text;
      } else {
        // Weekly schedule (7 days)
        const grouped = new Map<string, ImamScheduleItem[]>();
        for (const item of schedules) {
          const key = typeof item.scheduleDate === "string" ? item.scheduleDate.slice(0, 10) : new Date(item.scheduleDate).toISOString().slice(0, 10);
          const list = grouped.get(key) ?? [];
          list.push(item);
          grouped.set(key, list);
        }

        const sortedDates = Array.from(grouped.keys()).sort().slice(0, 7);
        const startDateStr = sortedDates[0] ? formatDateOnlyShort(new Date(sortedDates[0] + "T00:00:00Z")) : "-";
        const endDateStr = sortedDates[sortedDates.length - 1] ? formatDateOnlyShort(new Date(sortedDates[sortedDates.length - 1] + "T00:00:00Z")) : "-";

        let text = `🕌 *JADWAL IMAM & MUADZIN SHALAT FARDHU*\n`;
        text += `*${mosqueName}*\n`;
        text += `_Periode: ${startDateStr} s.d. ${endDateStr}_\n\n`;
        text += `السلام عليكم ورحمة الله وبركاته\n`;
        text += `Berikut jadwal penugasan Imam & Muadzin sepekan di ${mosqueName}:\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

        for (const dateKey of sortedDates) {
          const list = grouped.get(dateKey) ?? [];
          const dateObj = new Date(dateKey + "T00:00:00Z");
          const dayTitle = formatDateOnlyShort(dateObj).toUpperCase();

          text += `📅 *${dayTitle}*\n`;
          const order = ["Subuh", "Zuhur", "Asar", "Magrib", "Isya"];
          list.sort((a, b) => order.indexOf(a.prayerName) - order.indexOf(b.prayerName));

          for (const item of list) {
            text += `• *${item.prayerName}*: Imam: ${item.imamName || "-"} | Mzd: ${item.muadzinName || "-"}\n`;
          }
          text += `\n`;
        }

        if (rollingImamName) {
          text += `━━━━━━━━━━━━━━━━━━━━━\n`;
          text += `✨ *Rotasi Subuh Jumat Pekan Ini*: ${rollingImamName}\n`;
        }

        text += `\n📌 *Catatan Takmir:*\n`;
        text += `1. Petugas diharapkan hadir minimal 15 menit sebelum adzan.\n`;
        text += `2. Apabila berhalangan hadir karena uzur syar'i, harap konfirmasi H-1 ke Pengurus DKM.\n\n`;
        text += `جزاكم الله خيرا وبارك الله فيكم\n`;
        text += `والسلام عليكم ورحمة الله وبركاته\n\n`;
        text += `🌐 *Lihat jadwal online lengkap:* \n${siteUrl}/jadwal-imam`;
        return text;
      }
    } else {
      // Type === "shalat"
      if (sharePeriod === "today") {
        const dateStr = formatDateOnlyLong(new Date());
        let text = `🕌 *JADWAL WAKTU SHALAT & IQAMAH HARI INI*\n`;
        text += `*${mosqueName}*\n`;
        text += `📅 *${dateStr}*\n\n`;
        text += `السلام عليكم ورحمة الله وبركاته\n`;
        text += `Berikut waktu adzan dan iqamah shalat fardhu hari ini (WIB):\n\n`;

        if (todayIqamah.length > 0) {
          for (const item of todayIqamah) {
            text += `• *${item.label}*: Adzan ${item.adhanTime} WIB (Iqamah: ${item.iqamahTime} WIB)\n`;
          }
        }

        text += `\n📍 _Waktu dihitung otomatis mengacu pada koordinat Masjid Abu Dzar._\n\n`;
        text += `🌐 *Cek hitung mundur shalat & TV display:* \n${siteUrl}/jadwal-shalat`;
        return text;
      } else {
        // 7 days shalat
        let text = `🕌 *JADWAL WAKTU SHALAT 7 HARI*\n`;
        text += `*${mosqueName}*\n`;
        text += `_Zona Waktu: WIB (UTC+7)_\n\n`;
        text += `السلام عليكم ورحمة الله وبركاته\n`;
        text += `Berikut ringkasan jadwal waktu shalat 7 hari ke depan:\n`;
        text += `━━━━━━━━━━━━━━━━━━━━━\n`;

        for (const day of prayerTimesDays.slice(0, 7)) {
          const dateObj = day.date instanceof Date ? day.date : new Date(day.date);
          const dStr = formatDateOnlyShort(dateObj);
          text += `📅 *${dStr}*\n`;
          text += `• Subuh: ${day.times.fajr ?? "-"} | Terbit: ${day.times.sunrise ?? "-"}\n`;
          text += `• Zuhur: ${day.times.dhuhr ?? "-"} | Asar: ${day.times.asr ?? "-"}\n`;
          text += `• Magrib: ${day.times.maghrib ?? "-"} | Isya: ${day.times.isha ?? "-"}\n\n`;
        }

        text += `━━━━━━━━━━━━━━━━━━━━━\n`;
        text += `🌐 *Tabel lengkap & jeda iqamah:* \n${siteUrl}/jadwal-shalat`;
        return text;
      }
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleCopyText() {
    const text = generateWhatsAppText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Teks jadwal berhasil disalin ke clipboard! Siap dipaste ke grup WhatsApp.");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Gagal menyalin teks ke clipboard");
    }
  }

  function handleSendWhatsApp() {
    const text = generateWhatsAppText();
    const encoded = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setModalOpen(false);
  }

  return (
    <>
      {/* Button Bar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {/* WhatsApp Share Modal Trigger */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-xl border font-bold shadow-sm transition-all active:scale-95 text-xs sm:text-sm px-3.5 py-2 ${
            variant === "admin"
              ? "border-[#25d366]/40 bg-[#25d366]/10 text-[#128c7e] hover:bg-[#25d366]/20"
              : "border-[#25d366]/50 bg-[#25d366] text-white hover:bg-[#20ba59]"
          }`}
          title="Bagikan jadwal ke WhatsApp grup takmir, pengurus & jamaah"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Bagikan ke WhatsApp</span>
        </button>

        {/* Direct Copy Button */}
        <button
          type="button"
          onClick={handleCopyText}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-[#19261f] shadow-sm hover:bg-[#faf7f2] hover:border-[#bde5d2] active:scale-95 transition-all"
          title="Salin teks jadwal berformat WhatsApp langsung"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-[#2d946e]" />
              <span className="text-[#2d946e]">Tersalin!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-[#7c6630]" />
              <span>Salin Teks WA</span>
            </>
          )}
        </button>

        {/* Print & PDF A4 Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2d946e]/40 bg-gradient-to-r from-[#2d946e] to-[#206f52] px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:from-[#35a87e] hover:to-[#267f5e] active:scale-95 transition-all"
          title="Cetak langsung atau simpan sebagai dokumen PDF A4 resmi DKM"
        >
          <Printer className="h-4 w-4" />
          <span>Cetak / PDF A4</span>
        </button>
      </div>

      {/* WhatsApp Share Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[#ded5c4] bg-[#fdfbf7] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#ded5c4] bg-gradient-to-r from-[#128c7e] to-[#075e54] px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Bagikan Jadwal ke WhatsApp
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Kirimkan format penugasan rapi ke grup Takmir, Asatidzah &amp; Jamaah
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Period Selector Tabs */}
              <div className="flex rounded-xl border border-[#ded5c4] bg-[#f4eee2] p-1">
                <button
                  type="button"
                  onClick={() => setSharePeriod("week")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    sharePeriod === "week"
                      ? "bg-white text-[#19261f] shadow-sm"
                      : "text-[#5a685e] hover:text-[#19261f]"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-[#2d946e]" />
                  <span>Jadwal Sepekan (7 Hari)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSharePeriod("today")}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    sharePeriod === "today"
                      ? "bg-white text-[#19261f] shadow-sm"
                      : "text-[#5a685e] hover:text-[#19261f]"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#8a6820]" />
                  <span>Jadwal Hari Ini</span>
                </button>
              </div>

              {/* Message Live Preview Box (WhatsApp Chat Bubble Look) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#19261f] flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#2d946e]" />
                    <span>Pratinjau Pesan WhatsApp:</span>
                  </label>
                  <span className="text-[10px] text-[#748479]">
                    Format teks siap kirim
                  </span>
                </div>

                <div className="relative rounded-2xl border border-[#d2e3c8] bg-[#e6eedd]/60 p-4 font-mono text-xs text-[#19261f] max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {generateWhatsAppText()}
                </div>
              </div>

              {/* Information Hint */}
              <p className="text-[11px] text-[#5c6e63] italic">
                💡 Tombol <b>&quot;Kirim ke WhatsApp&quot;</b> akan membuka WhatsApp Web / Aplikasi di perangkat Anda dengan pesan yang sudah terisi otomatis.
              </p>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 border-t border-[#ded5c4] bg-[#fbf9f4] px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto rounded-xl border border-[#ded5c4] bg-white px-4 py-2.5 text-xs font-semibold text-[#5a685e] hover:bg-[#f4eee2] transition-colors"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#ded5c4] bg-white px-4 py-2.5 text-xs font-bold text-[#19261f] hover:bg-[#faf7f2] shadow-sm transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[#2d946e]" />
                    <span className="text-[#2d946e]">Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-[#7c6630]" />
                    <span>Salin Teks Pesan</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] hover:bg-[#20ba59] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Kirim ke WhatsApp</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
