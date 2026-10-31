"use client";

import { useEffect, useRef, useState } from "react";
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
} from "@/components/ui";
import {
  Building2,
  Calculator,
  Clock3,
  MapPin,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

interface MosqueSettings {
  mosqueName: string;
  logoUrl: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  mapUrl: string;
  prayerCalculationMethod: string;
  asrMethod: string;
  prayerAdjustments: Record<string, number> | null;
}

const METHODS = [
  ["KEMENAG", "Kemenag RI (Standar Resmi Indonesia)"],
  ["Singapore", "MUIS Singapore"],
  ["MWL", "Muslim World League"],
  ["Makkah", "Umm Al-Qura (Makkah)"],
  ["Egypt", "Egyptian General Authority"],
  ["ISNA", "Islamic Society of North America"],
  ["Karachi", "University of Islamic Sciences, Karachi"],
  ["Dubai", "Dubai"],
  ["Turkey", "Turkey"],
  ["Tehran", "Tehran"],
];

const ADJUST_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const ADJUST_LABELS: Record<string, string> = {
  fajr: "Subuh",
  sunrise: "Terbit",
  dhuhr: "Zuhur",
  asr: "Asar",
  maghrib: "Magrib",
  isha: "Isya",
};

export default function AdminMasjidPage() {
  const [form, setForm] = useState<MosqueSettings | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Format berkas harus berupa gambar (PNG, JPG, SVG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 512;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/webp", 0.88);
          update("logoUrl", dataUrl);
          toast.success("Foto logo berhasil dimuat dari perangkat!");
        } else {
          update("logoUrl", src);
          toast.success("Foto logo berhasil dimuat!");
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/mosque-settings", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data) {
          setForm(data);
          setAdjustments(data.prayerAdjustments ?? {});
        }
      } catch {
        toast.error("Gagal memuat pengaturan");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update<K extends keyof MosqueSettings>(key: K, value: MosqueSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mosque-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          timezone: "Asia/Jakarta",
          prayerAdjustments: adjustments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success("Pengaturan masjid disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={Building2}
        title="Pengaturan Masjid"
        description="Identitas, koordinat, dan metode perhitungan waktu shalat."
      />

      {loading || !form ? (
        <Card className="max-w-4xl">
          <LoadingState />
        </Card>
      ) : (
        <Card className="max-w-4xl">
          <div className="space-y-8">
            <section>
              <SectionHeading
                icon={Building2}
                title="Identitas Masjid"
                description="Nama dan alamat yang tampil pada web publik serta TV display."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="mosqueName">Nama Masjid</Label>
                  <Input
                    id="mosqueName"
                    value={form.mosqueName}
                    onChange={(e) => update("mosqueName", e.target.value)}
                  />
                </div>
                {/* Logo Masjid from Device */}
                <div className="sm:col-span-2 rounded-2xl border border-[#ded5c4] bg-[#fdfbf7] p-4 sm:p-5">
                  <Label>Logo Masjid</Label>
                  <p className="text-xs text-[#5c6e63] mb-4">
                    Pilih foto atau gambar logo masjid dari komputer/HP Anda. Logo akan tampil di navbar, beranda, dan layar TV digital.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Preview Box */}
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#2d946e]/40 bg-white shadow-sm ring-4 ring-[#2d946e]/10">
                      {form.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.logoUrl}
                          alt="Logo Preview"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-3xl block">🕌</span>
                          <span className="text-[9px] font-semibold text-[#8e9f94] block mt-1">Belum Ada</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-[#2d946e] hover:bg-[#237858] text-white text-xs py-2 px-3.5 shadow-sm"
                        >
                          <Upload className="h-4 w-4 mr-1.5" />
                          <span>Pilih Foto dari Perangkat</span>
                        </Button>
                        {form.logoUrl && (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => update("logoUrl", null)}
                            className="text-xs py-2 px-3"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            <span>Hapus Logo</span>
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-[#78887e]">
                        Format yang didukung: PNG, JPG, JPEG, SVG, WebP (Maks. 5 MB).
                      </p>
                    </div>
                  </div>

                  {/* Fallback Text Input URL */}
                  <div className="mt-4 pt-4 border-t border-[#ded5c4]/60">
                    <Label htmlFor="logoUrl" className="text-[11px] text-[#78887e]">
                      Atau Masukkan Tautan URL Logo (Opsional):
                    </Label>
                    <Input
                      id="logoUrl"
                      value={form.logoUrl?.startsWith("data:") ? "(Gambar dari perangkat terpasang)" : (form.logoUrl ?? "")}
                      disabled={form.logoUrl?.startsWith("data:")}
                      onChange={(e) => update("logoUrl", e.target.value)}
                      placeholder="https://.../logo.png"
                      className="text-xs bg-white"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={form.address ?? ""}
                    onChange={(e) => update("address", e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <SectionHeading
                icon={MapPin}
                title="Lokasi & Zona Waktu"
                description="Koordinat digunakan untuk perhitungan waktu shalat otomatis."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="0.000001"
                    value={form.latitude}
                    onChange={(e) => update("latitude", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="0.000001"
                    value={form.longitude}
                    onChange={(e) => update("longitude", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Zona Waktu</Label>
                  <Input
                    id="timezone"
                    value="Asia/Jakarta"
                    readOnly
                    className="bg-slate-50 text-slate-600"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Perhitungan shalat dipatok ke Asia/Jakarta (WIB) dan tidak
                    dapat diubah.
                  </p>
                </div>
                <div>
                  <Label htmlFor="mapUrl">URL Google Maps</Label>
                  <Input
                    id="mapUrl"
                    value={form.mapUrl}
                    onChange={(e) => update("mapUrl", e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <SectionHeading
                icon={Calculator}
                title="Metode Perhitungan"
                description="Sesuaikan metode dengan pedoman yang digunakan masjid."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="method">Metode Perhitungan</Label>
                  <Select
                    id="method"
                    value={form.prayerCalculationMethod}
                    onChange={(e) =>
                      update("prayerCalculationMethod", e.target.value)
                    }
                  >
                    {METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="asr">Metode Asar</Label>
                  <Select
                    id="asr"
                    value={form.asrMethod}
                    onChange={(e) => update("asrMethod", e.target.value)}
                  >
                    <option value="STANDARD">
                      Standar (Syafi&apos;i, Maliki, Hanbali)
                    </option>
                    <option value="HANAFI">Hanafi</option>
                  </Select>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <SectionHeading
                icon={Clock3}
                title="Koreksi Waktu (menit)"
                description="Nilai positif menambah, negatif mengurangi. Berguna untuk menyesuaikan jadwal setempat."
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ADJUST_KEYS.map((key) => (
                  <div key={key}>
                    <Label htmlFor={"adj-" + key}>{ADJUST_LABELS[key]}</Label>
                    <Input
                      id={"adj-" + key}
                      type="number"
                      value={adjustments[key] ?? 0}
                      onChange={(e) =>
                        setAdjustments((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-slate-100 pt-6">
              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Pengaturan"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
