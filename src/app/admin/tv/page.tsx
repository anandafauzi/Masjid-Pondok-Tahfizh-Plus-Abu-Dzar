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
import { ExternalLink, MonitorPlay, Save, SlidersHorizontal } from "lucide-react";

interface DisplaySettings {
  slideIntervalSeconds: number;
  autoRotateEnabled: boolean;
  tickerSpeed: number;
  tickerEnabled: boolean;
  showHijriDate: boolean;
}

const DEFAULTS: DisplaySettings = {
  slideIntervalSeconds: 10,
  autoRotateEnabled: true,
  tickerSpeed: 50,
  tickerEnabled: true,
  showHijriDate: true,
};

export default function AdminTvPage() {
  const [form, setForm] = useState<DisplaySettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/display-settings", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data) setForm({ ...DEFAULTS, ...data });
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
      toast.success("Pengaturan TV disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={MonitorPlay}
        title="Tampilan TV"
        description="Atur perilaku slide, running text, dan informasi tanggal pada layar masjid."
        action={
          <Link
            href="/tv"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/30 transition-all hover:from-emerald-400 hover:to-emerald-500 active:scale-95"
          >
            <MonitorPlay className="h-4 w-4" />
            Pratinjau TV
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>
        }
      />

      {loading ? (
        <Card className="max-w-2xl">
          <LoadingState />
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <SectionHeading
            icon={SlidersHorizontal}
            title="Pengaturan Tampilan"
            description="Perubahan akan diterapkan pada TV setelah data dimuat ulang."
          />

          <div className="space-y-5">
            <div>
              <Label htmlFor="interval">Interval Slide (detik)</Label>
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
                Antara 3 - 120 detik.
              </p>
            </div>

            <div>
              <Label htmlFor="speed">Kecepatan Running Text</Label>
              <Select
                id="speed"
                value={form.tickerSpeed}
                onChange={(e) =>
                  setForm({ ...form, tickerSpeed: Number(e.target.value) })
                }
              >
                <option value={30}>Lambat</option>
                <option value={50}>Sedang</option>
                <option value={80}>Cepat</option>
                <option value={120}>Sangat Cepat</option>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Toggle
                label="Rotasi slide otomatis"
                description="Slide berganti otomatis sesuai interval."
                checked={form.autoRotateEnabled}
                onChange={(value) =>
                  setForm({ ...form, autoRotateEnabled: value })
                }
              />
              <Toggle
                label="Tampilkan running text"
                description="Teks berjalan di bagian bawah layar."
                checked={form.tickerEnabled}
                onChange={(value) =>
                  setForm({ ...form, tickerEnabled: value })
                }
              />
              <Toggle
                label="Tampilkan tanggal Hijriah"
                description="Tanggal Hijriah di samping jam digital."
                checked={form.showHijriDate}
                onChange={(value) =>
                  setForm({ ...form, showHijriDate: value })
                }
              />
            </div>

            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
