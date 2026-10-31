"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Button,
  Card,
  Input,
  Label,
  LoadingState,
  PageHeader,
  SectionHeading,
  Select,
  Toggle,
} from "@/components/ui";
import {
  ExternalLink,
  MonitorPlay,
  Save,
  SlidersHorizontal,
  CloudSun,
  BellRing,
  Sparkles,
  HeartHandshake,
  BookMarked,
  Moon,
  Megaphone,
} from "lucide-react";
import type { SpecialAnnouncement, TvThemeSettings } from "@/lib/settings";

interface DisplaySettingsForm {
  slideIntervalSeconds: number;
  autoRotateEnabled: boolean;
  tickerSpeed: number;
  tickerEnabled: boolean;
  showHijriDate: boolean;
  themeSettings: TvThemeSettings;
}

const DEFAULT_THEME_SETTINGS: TvThemeSettings = {
  showWeather: true,
  weatherCity: "Rumpin, Bogor",
  activePrayerGlow: true,
  specialAnnouncement: {
    enabled: false,
    type: "duka",
    title: "Inna lillahi wa inna ilayhi raji'un",
    subtitle: "Telah berpulang ke Rahmatullah",
    personName: "",
    details: "",
    notes: "Semoga Allah mengampuni dosa-dosanya dan menempatkannya di jannah-Nya.",
  },
};

const DEFAULTS: DisplaySettingsForm = {
  slideIntervalSeconds: 10,
  autoRotateEnabled: true,
  tickerSpeed: 50,
  tickerEnabled: true,
  showHijriDate: true,
  themeSettings: DEFAULT_THEME_SETTINGS,
};

export default function AdminTvPage() {
  const [form, setForm] = useState<DisplaySettingsForm>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/display-settings", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data) {
          setForm({
            ...DEFAULTS,
            ...data,
            themeSettings: {
              ...DEFAULT_THEME_SETTINGS,
              ...(data.themeSettings || {}),
              specialAnnouncement: {
                ...DEFAULT_THEME_SETTINGS.specialAnnouncement!,
                ...(data.themeSettings?.specialAnnouncement || {}),
              },
            },
          });
        }
      } catch {
        toast.error("Gagal memuat pengaturan");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/display-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success("Pengaturan TV berhasil disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  const applyTemplate = (type: "duka" | "kajian" | "tarawih" | "umum") => {
    let t: SpecialAnnouncement;
    switch (type) {
      case "duka":
        t = {
          enabled: true,
          type: "duka",
          title: "Inna lillahi wa inna ilayhi raji'un",
          subtitle: "Telah Berpulang ke Rahmatullah",
          personName: "Bapak H. Ahmad Dahlan bin Fulan",
          details: "Wafat pada hari Sabtu, 31 Oktober 2026 (Usia 68 Tahun)\nDishalatkan ba'da Dzuhur di Masjid Abu Dzar • Dimakamkan di TPU Rumpin",
          notes: "Keluarga besar Masjid Pondok Tahfizh Plus Abu Dzar turut berduka cita sedalam-dalamnya.",
        };
        break;
      case "kajian":
        t = {
          enabled: true,
          type: "kajian",
          title: "TABLIGH AKBAR & KAJIAN SPESIAL",
          subtitle: "Terbuka Untuk Umum (Ikhwan & Akhwat)",
          personName: "Ustadz Dr. Abdullah Fulan, M.A.",
          details: "Tema: 'Meniti Jalan Menuju Surga Bersama Al-Qur'an'\nAhad Pagi, 08.30 WIB - Selesai • Ruang Utama Masjid Abu Dzar",
          notes: "Disediakan sarapan bersama & tempat wudhu bersih.",
        };
        break;
      case "tarawih":
        t = {
          enabled: true,
          type: "tarawih",
          title: "BUKA PUASA BERSAMA & SHALAT TARAWIH",
          subtitle: "Semarak Ibadah Ramadhan Masjid Abu Dzar",
          personName: "Imam: Asatidz & Santri Hafizh 30 Juz",
          details: "Ta'jil Gratis & Buka Puasa Bersama setiap hari menjelang Maghrib\nDilanjutkan Shalat Isya & Tarawih 11 Rakaat 1 Juz per malam",
          notes: "Salurkan infaq ifthar Anda melalui rekening resmi DKM Masjid Abu Dzar.",
        };
        break;
      case "umum":
        t = {
          enabled: true,
          type: "umum",
          title: "PENGUMUMAN PENTING DKM",
          subtitle: "Himbauan Untuk Seluruh Jama'ah",
          personName: "Pengurus DKM Masjid Abu Dzar",
          details: "Akan diadakan kegiatan gotong royong pembersihan karpet dan lingkungan masjid pada hari Ahad, pukul 07.00 WIB.",
          notes: "Diharapkan partisipasi dan kehadiran seluruh jama'ah.",
        };
        break;
    }

    setForm((prev) => ({
      ...prev,
      themeSettings: {
        ...prev.themeSettings,
        specialAnnouncement: t,
      },
    }));
    toast.success(`Template ${type.toUpperCase()} diterapkan! Klik simpan untuk menayangkan di TV.`);
  };

  const ann = form.themeSettings.specialAnnouncement || DEFAULT_THEME_SETTINGS.specialAnnouncement!;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        icon={MonitorPlay}
        title="Tampilan TV Display"
        description="Atur perilaku slide, widget cuaca, tema visual, dan pengumuman khusus di layar TV masjid."
        action={
          <Link
            href="/tv"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-95"
          >
            <MonitorPlay className="h-4 w-4" />
            Buka Layar TV
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>
        }
      />

      {loading ? (
        <Card className="max-w-4xl">
          <LoadingState />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* KOLOM KIRI: Pengaturan Dasar & Cuaca */}
          <div className="space-y-6">
            <Card>
              <SectionHeading
                icon={SlidersHorizontal}
                title="Perilaku Slide & Ticker"
                description="Kecepatan rotasi konten di layar monitor masjid."
              />

              <div className="space-y-4">
                <div>
                  <Label htmlFor="interval">Interval Pergantian Slide (detik)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min={3}
                    max={120}
                    value={form.slideIntervalSeconds}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slideIntervalSeconds: Number(e.target.value),
                      })
                    }
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Standar: 10–15 detik agar jama&apos;ah nyaman membaca.
                  </p>
                </div>

                <div>
                  <Label htmlFor="speed">Kecepatan Running Text (Bawah Layar)</Label>
                  <Select
                    id="speed"
                    value={form.tickerSpeed}
                    onChange={(e) =>
                      setForm({ ...form, tickerSpeed: Number(e.target.value) })
                    }
                  >
                    <option value={30}>Lambat (Sangat Nyaman)</option>
                    <option value={50}>Sedang (Standar TV Masjid)</option>
                    <option value={80}>Cepat</option>
                    <option value={120}>Sangat Cepat</option>
                  </Select>
                </div>

                <div className="space-y-3 pt-2">
                  <Toggle
                    label="Rotasi Slide Otomatis"
                    description="Slide berganti secara berputar otomatis."
                    checked={form.autoRotateEnabled}
                    onChange={(value) =>
                      setForm({ ...form, autoRotateEnabled: value })
                    }
                  />
                  <Toggle
                    label="Tampilkan Running Text"
                    description="Teks berjalan memuat pengumuman di bawah layar."
                    checked={form.tickerEnabled}
                    onChange={(value) =>
                      setForm({ ...form, tickerEnabled: value })
                    }
                  />
                  <Toggle
                    label="Tampilkan Tanggal Hijriah"
                    description="Kalender Hijriah otomatis mendampingi kalender masehi."
                    checked={form.showHijriDate}
                    onChange={(value) =>
                      setForm({ ...form, showHijriDate: value })
                    }
                  />
                </div>
              </div>
            </Card>

            {/* WIDGET CUACA & ESTETIKA */}
            <Card>
              <SectionHeading
                icon={CloudSun}
                title="Widget Cuaca & Estetika Visual"
                description="Informasi kondisi cuaca lokal dan efek tampilan pada TV."
              />

              <div className="space-y-4">
                <Toggle
                  label="Aktifkan Widget Cuaca & Suhu"
                  description="Menampilkan perkiraan cuaca dan suhu aktual di header TV."
                  checked={form.themeSettings.showWeather !== false}
                  onChange={(val) =>
                    setForm({
                      ...form,
                      themeSettings: { ...form.themeSettings, showWeather: val },
                    })
                  }
                />

                {form.themeSettings.showWeather !== false && (
                  <div>
                    <Label htmlFor="weatherCity">Nama Lokasi Cuaca</Label>
                    <Input
                      id="weatherCity"
                      value={form.themeSettings.weatherCity || "Rumpin, Bogor"}
                      placeholder="Contoh: Rumpin, Bogor"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          themeSettings: { ...form.themeSettings, weatherCity: e.target.value },
                        })
                      }
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Koordinat otomatis disinkronkan dengan lokasi Masjid di Pengaturan.
                    </p>
                  </div>
                )}

                <Toggle
                  label="Efek Glowing Waktu Shalat Mendekat"
                  description="Kartu waktu shalat yang sedang aktif akan bersinar lembut."
                  checked={form.themeSettings.activePrayerGlow !== false}
                  onChange={(val) =>
                    setForm({
                      ...form,
                      themeSettings: { ...form.themeSettings, activePrayerGlow: val },
                    })
                  }
                />
              </div>
            </Card>
          </div>

          {/* KOLOM KANAN: TEMPLATE PENGUMUMAN KHUSUS */}
          <div className="space-y-6">
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
              <SectionHeading
                icon={BellRing}
                title="Template Pengumuman Khusus TV"
                description="Tayangkan berita lelayu duka cita, tabligh akbar, atau pengumuman darurat langsung di TV."
              />

              {/* Quick Template Buttons */}
              <div className="mb-5">
                <Label>Pilih Template Cepat (Isi Otomatis):</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => applyTemplate("duka")}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 p-2.5 text-center text-xs font-semibold text-slate-200 transition-all hover:border-amber-400 hover:text-amber-300 active:scale-95"
                  >
                    <HeartHandshake className="h-4 w-4 text-rose-400" />
                    <span>Duka Cita</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("kajian")}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 p-2.5 text-center text-xs font-semibold text-slate-200 transition-all hover:border-emerald-400 hover:text-emerald-300 active:scale-95"
                  >
                    <BookMarked className="h-4 w-4 text-emerald-400" />
                    <span>Kajian Akbar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("tarawih")}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 p-2.5 text-center text-xs font-semibold text-slate-200 transition-all hover:border-teal-400 hover:text-teal-300 active:scale-95"
                  >
                    <Moon className="h-4 w-4 text-teal-400" />
                    <span>Buka Puasa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("umum")}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 p-2.5 text-center text-xs font-semibold text-slate-200 transition-all hover:border-blue-400 hover:text-blue-300 active:scale-95"
                  >
                    <Megaphone className="h-4 w-4 text-blue-400" />
                    <span>Pengumuman</span>
                  </button>
                </div>
              </div>

              {/* Form Input Pengumuman */}
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <Toggle
                    label="TAYANGKAN PENGUMUMAN INI DI TV SEKARANG"
                    description="Jika aktif, banner & slide pengumuman ini akan langsung muncul di monitor TV masjid."
                    checked={ann.enabled}
                    onChange={(val) =>
                      setForm({
                        ...form,
                        themeSettings: {
                          ...form.themeSettings,
                          specialAnnouncement: { ...ann, enabled: val },
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="annTitle">Judul Utama</Label>
                  <Input
                    id="annTitle"
                    value={ann.title}
                    placeholder="Contoh: INNA LILLAHI WA INNA ILAYHI RAJI'UN"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        themeSettings: {
                          ...form.themeSettings,
                          specialAnnouncement: { ...ann, title: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="annSubtitle">Subjudul / Kategori</Label>
                  <Input
                    id="annSubtitle"
                    value={ann.subtitle || ""}
                    placeholder="Contoh: Telah Berpulang ke Rahmatullah"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        themeSettings: {
                          ...form.themeSettings,
                          specialAnnouncement: { ...ann, subtitle: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="annPerson">Nama Tokoh / Almarhum / Penceramah</Label>
                  <Input
                    id="annPerson"
                    value={ann.personName || ""}
                    placeholder="Contoh: Bapak H. Ahmad Dahlan bin Fulan"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        themeSettings: {
                          ...form.themeSettings,
                          specialAnnouncement: { ...ann, personName: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="annDetails">Keterangan Waktu, Tempat & Jadwal</Label>
                  <textarea
                    id="annDetails"
                    rows={3}
                    value={ann.details || ""}
                    placeholder="Waktu shalat jenazah, tanggal pemakaman, atau jadwal kajian..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        themeSettings: {
                          ...form.themeSettings,
                          specialAnnouncement: { ...ann, details: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="annNotes">Catatan Tambahan / Doa Himbauan</Label>
                  <Input
                    id="annNotes"
                    value={ann.notes || ""}
                    placeholder="Contoh: Semoga Allah mengampuni dosa-dosanya dan menempatkannya di jannah-Nya."
                    onChange={(e) =>
                      setForm({
                        ...form,
                        themeSettings: {
                          ...form.themeSettings,
                          specialAnnouncement: { ...ann, notes: e.target.value },
                        },
                      })
                    }
                  />
                </div>
              </div>

              {/* LIVE MINI PREVIEW */}
              {ann.enabled && (
                <div className="mt-5 rounded-2xl border border-amber-500/40 bg-[#0e1713] p-4 text-white shadow-xl">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Pratinjau Tampilan di TV</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <span className="inline-block rounded-full bg-amber-400/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      {ann.subtitle || "PENGUMUMAN KHUSUS"}
                    </span>
                    <h4 className="mt-1 font-serif text-lg font-bold text-[#eddcb2]">
                      {ann.title}
                    </h4>
                    {ann.personName && (
                      <p className="mt-2 text-base font-extrabold text-white">
                        {ann.personName}
                      </p>
                    )}
                    {ann.details && (
                      <p className="mt-1 whitespace-pre-line text-xs text-slate-300">
                        {ann.details}
                      </p>
                    )}
                    {ann.notes && (
                      <p className="mt-2 text-[11px] italic text-[#a3c2b1]">
                        &ldquo;{ann.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* TOMBOL SIMPAN */}
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan Pengaturan..." : "Simpan Semua Pengaturan TV"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
