"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  LoadingState,
  PageHeader,
  SectionHeading,
  Textarea,
} from "@/components/ui";
import {
  Megaphone,
  Pencil,
  Plus,
  Power,
  Save,
  Trash2,
} from "lucide-react";

interface RunningText {
  id: string;
  content: string;
  displayOrder: number;
  isActive: boolean;
}

export default function AdminRunningTextPage() {
  const [items, setItems] = useState<RunningText[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RunningText | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/running-texts", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!content.trim()) return toast.error("Isi running text wajib diisi");
    setSaving(true);
    try {
      const res = await fetch("/api/running-texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah");
      toast.success("Running text ditambahkan");
      setContent("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/running-texts/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editing.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success("Running text diperbarui");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: RunningText) {
    try {
      const res = await fetch(`/api/running-texts/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      toast.error("Gagal mengubah status");
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus running text ini?")) return;
    try {
      const res = await fetch(`/api/running-texts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Running text dihapus");
      await load();
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  const preview = items
    .filter((item) => item.isActive)
    .map((item) => item.content)
    .join("     ✦     ");

  return (
    <div>
      <PageHeader
        icon={Megaphone}
        title="Running Text"
        description="Teks berjalan di bagian bawah layar TV (disembunyikan saat khutbah)."
      />

      <Card className="mb-6">
        <SectionHeading
          icon={Plus}
          title="Tambah Running Text"
          description="Teks akan tampil bergantian di bawah layar TV."
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="new-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis teks pengumuman..."
          />
          <Button onClick={add} disabled={saving}>
            <Plus className="h-4 w-4" /> Tambah
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
          <div className="flex items-center">
            <span className="flex shrink-0 items-center gap-2 bg-emerald-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <Megaphone className="h-3.5 w-3.5" />
              Pratinjau
            </span>
            <div className="overflow-hidden whitespace-nowrap px-3 py-1.5 text-xs text-slate-200">
              <span className="inline-block animate-marquee">
                {preview ||
                  "Selamat datang di Masjid Pondok Tahfizh Plus Abu Dzar"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-xs text-slate-500">
              Belum ada running text.
            </p>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              {editing?.id === item.id ? (
                <div className="space-y-3">
                  <Label>Edit Running Text</Label>
                  <Textarea
                    rows={2}
                    value={editing.content}
                    onChange={(e) =>
                      setEditing({ ...editing, content: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveEdit} disabled={saving}>
                      <Save className="h-4 w-4" /> Simpan
                    </Button>
                    <Button variant="secondary" onClick={() => setEditing(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                      <Badge color={item.isActive ? "green" : "slate"}>
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        Urutan {item.displayOrder}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {item.content}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Button variant="secondary" onClick={() => setEditing(item)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="secondary" onClick={() => toggle(item)}>
                      <Power className="h-3.5 w-3.5" />
                      {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    <Button variant="danger" onClick={() => remove(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
