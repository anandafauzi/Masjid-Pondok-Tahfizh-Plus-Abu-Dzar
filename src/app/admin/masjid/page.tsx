"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

interface MosqueSettings {
  mosqueName: string;
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
  ["MWL", "Muslim World League"],
  ["ISNA", "Islamic Society of North America"],
  ["Egypt", "Egyptian General Authority"],
  ["Makkah", "Umm Al-Qura (Makkah)"],
  ["Karachi", "University of Islamic Sciences, Karachi"],
  ["Dubai", "Dubai"],
  ["Singapore", "Singapore"],
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
        body: JSON.stringify({ ...form, prayerAdjustments: adjustments }),
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
                    value={form.timezone}
                    onChange={(e) => update("timezone", e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Perhitungan saat ini dipatok ke Asia/Jakarta (WIB).
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
