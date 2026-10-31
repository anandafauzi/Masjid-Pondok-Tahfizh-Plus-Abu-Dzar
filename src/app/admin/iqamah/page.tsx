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
import { Save, Timer } from "lucide-react";
import { getPrayerArabicName } from "@/utils/constants";

interface IqamahSetting {
  id?: string;
  prayerName: string;
  mode: "DELAY_MINUTES" | "FIXED_TIME";
  delayMinutes: number;
  fixedIqamahTime: string | null;
}

const ORDER = ["Subuh", "Zuhur", "Asar", "Magrib", "Isya"];
const DEFAULT_DELAYS: Record<string, number> = {
  Subuh: 20,
  Zuhur: 15,
  Asar: 15,
  Magrib: 5,
  Isya: 15,
};

export default function AdminIqamahPage() {
  const [items, setItems] = useState<IqamahSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/iqamah-settings", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          const map = new Map<string, IqamahSetting>();
          for (const d of data) map.set(d.prayerName, d);
          setItems(
            ORDER.map(
              (name) =>
                map.get(name) ?? {
                  prayerName: name,
                  mode: "DELAY_MINUTES",
                  delayMinutes: DEFAULT_DELAYS[name] ?? 15,
                  fixedIqamahTime: null,
                }
            )
          );
        }
      } catch {
        toast.error("Gagal memuat pengaturan iqamah");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update(index: number, patch: Partial<IqamahSetting>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/iqamah-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success("Pengaturan iqamah disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={Timer}
        title="Pengaturan Iqamah"
        description="Atur jeda iqamah setelah adzan atau waktu iqamah tetap untuk tiap shalat."
      />

      <Card className="max-w-4xl">
        <SectionHeading
          icon={Timer}
          title="Jeda Adzan ke Iqamah"
          description="Nilai ini dipakai pada hitung mundur iqamah di web dan TV display."
        />

        {loading ? (
          <LoadingState />
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.prayerName}
                className="grid items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:grid-cols-[140px_1fr_1fr]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-arabic text-sm text-amber-600 ring-1 ring-slate-200">
                    {getPrayerArabicName(item.prayerName)}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {item.prayerName}
                  </span>
                </div>

                <div>
                  <Label htmlFor={"mode-" + index}>Mode</Label>
                  <Select
                    id={"mode-" + index}
                    value={item.mode}
                    onChange={(e) =>
                      update(index, {
                        mode: e.target.value as IqamahSetting["mode"],
                      })
                    }
                  >
                    <option value="DELAY_MINUTES">Jeda setelah adzan</option>
                    <option value="FIXED_TIME">Waktu tetap</option>
                  </Select>
                </div>

                {item.mode === "DELAY_MINUTES" ? (
                  <div>
                    <Label htmlFor={"delay-" + index}>Jeda (menit)</Label>
                    <Input
                      id={"delay-" + index}
                      type="number"
                      min={0}
                      max={120}
                      value={item.delayMinutes}
                      onChange={(e) =>
                        update(index, { delayMinutes: Number(e.target.value) })
                      }
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor={"fixed-" + index}>Waktu Iqamah</Label>
                    <Input
                      id={"fixed-" + index}
                      type="time"
                      value={item.fixedIqamahTime ?? ""}
                      onChange={(e) =>
                        update(index, { fixedIqamahTime: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            ))}

            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Pengaturan Iqamah"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
