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
  BookMarked,
  CalendarDays,
  MapPin,
  Pencil,
  Plus,
  Power,
  Trash2,
  User,
} from "lucide-react";

import { PetugasItem } from "@/types/petugas";

interface Kajian {
  id: string;
  title: string;
  speakerName: string;
  bookOrTopic: string | null;
  startDateTime: string;
  endDateTime: string | null;
  location: string;
  description: string | null;
  isActive: boolean;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminKajianPage() {
  const [items, setItems] = useState<Kajian[]>([]);
  const [petugas, setPetugas] = useState<PetugasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pemateriOptions = petugas.filter((p) => p.roles.includes("PEMATERI") && p.isActive).map((p) => p.name);

  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [topic, setTopic] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("Masjid");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      const [res, pRes] = await Promise.all([
        fetch("/api/kajian", { cache: "no-store" }),
        fetch("/api/petugas", { cache: "no-store" }),
      ]);
      const data = await res.json();
      if (res.ok) setItems(data);
      if (pRes.ok) setPetugas(await pRes.json());
    } catch {
      toast.error("Gagal memuat kajian");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setTitle("");
    setSpeaker("");
    setTopic("");
    setStart("");
    setEnd("");
    setLocation("Masjid");
    setDescription("");
    setEditingId(null);
  }

  function beginEdit(item: Kajian) {
    setTitle(item.title);
    setSpeaker(item.speakerName);
    setTopic(item.bookOrTopic ?? "");
    setStart(toLocalInput(item.startDateTime));
    setEnd(item.endDateTime ? toLocalInput(item.endDateTime) : "");
    setLocation(item.location);
    setDescription(item.description ?? "");
    setEditingId(item.id);
  }

  async function submit() {
    if (!title.trim() || !speaker.trim())
      return toast.error("Judul dan pemateri wajib diisi");
    if (!start) return toast.error("Waktu mulai wajib diisi");
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/kajian/${editingId}` : "/api/kajian",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            speakerName: speaker,
            bookOrTopic: topic || null,
            startDateTime: new Date(start).toISOString(),
            endDateTime: end ? new Date(end).toISOString() : null,
            location,
            description: description || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success(editingId ? "Kajian diperbarui" : "Kajian ditambahkan");
      resetForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Kajian) {
    try {
      const res = await fetch(`/api/kajian/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        item.isActive ? "Kajian dinonaktifkan" : "Kajian diaktifkan"
      );
      await load();
    } catch {
      toast.error("Gagal memperbarui status kajian");
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus kajian ini?")) return;
    try {
      const res = await fetch(`/api/kajian/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (editingId === id) resetForm();
      toast.success("Kajian dihapus");
      await load();
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  return (
    <div>
      <PageHeader
        icon={BookMarked}
        title="Jadwal Kajian"
        description="Kelola kajian rutin dan insidentil yang tampil di web serta TV masjid."
      />

      <Card className="mb-6">
        <SectionHeading
          icon={Plus}
          title={editingId ? "Edit Kajian" : "Tambah Kajian"}
          description="Isi informasi kajian dengan lengkap agar jamaah mudah menemukannya."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Judul Kajian</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Kajian Tafsir Jalalain"
            />
          </div>
          <div>
            <Label htmlFor="speaker">Pemateri</Label>
            <Input
              id="speaker"
              list="pemateri-names"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="Pilih atau ketik nama ustadz"
            />
          </div>
          <div>
            <Label htmlFor="topic">Kitab / Tema</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Opsional"
            />
          </div>
          <div>
            <Label htmlFor="start">Mulai</Label>
            <Input
              id="start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="end">Selesai (opsional)</Label>
            <Input
              id="end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="location">Lokasi</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Keterangan tambahan..."
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={submit} disabled={saving}>
            {editingId ? (
              <>
                <Pencil className="h-4 w-4" /> Simpan Perubahan
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Tambah Kajian
              </>
            )}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={resetForm}>
              Batal
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-xs text-slate-500">
              Belum ada kajian. Tambahkan kajian pertama melalui formulir di atas.
            </p>
          </Card>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              className="relative overflow-hidden border-l-4 border-l-emerald-500"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.title}
                    </h3>
                    <Badge color={item.isActive ? "green" : "slate"}>
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-emerald-500" />
                      {item.speakerName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-amber-500" />
                      {item.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-sky-500" />
                      {new Date(item.startDateTime).toLocaleString("id-ID", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  {item.bookOrTopic && (
                    <p className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {item.bookOrTopic}
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <Button variant="secondary" onClick={() => beginEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" onClick={() => toggleActive(item)}>
                    <Power className="h-3.5 w-3.5" />
                    {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button variant="danger" onClick={() => remove(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      {/* Datalist for quick speaker selection */}
      <datalist id="pemateri-names">
        {pemateriOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );
}
