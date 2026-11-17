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
  Toggle,
} from "@/components/ui";
import {
  BookMarked,
  CalendarClock,
  CalendarDays,
  MapPin,
  Pencil,
  Plus,
  Power,
  Repeat,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";

import { PetugasItem } from "@/types/petugas";
import { PetugasSelect } from "@/components/admin/petugas-select";
import { fromWibInput, toWibInput } from "@/lib/datetime";

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
  isRecurring: boolean;
  recurrenceDay: number | null;
  recurrenceUntil: string | null;
  rescheduledFrom: string | null;
}

interface KajianOccurrence extends Kajian {
  kajianId: string;
  occurrenceDate: string;
  isException: boolean;
  originalStartDateTime: string | null;
  exceptionNote: string | null;
}

interface RescheduleTarget {
  kajianId: string;
  occurrenceDate: string;
  label: string;
}

const WEEKDAY_LABELS = [
  "Ahad",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

function toLocalInput(iso: string) {
  return toWibInput(iso);
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function formatDateOnly(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00.000Z`));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

/** yyyy-MM-dd menurut kalender WIB. */
function ymdWib(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function weekdayName(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function weekdayLabel(day: number | null) {
  if (day === null || day < 0 || day > 6) return "-";
  return WEEKDAY_LABELS[day];
}

export default function AdminKajianPage() {
  const [items, setItems] = useState<Kajian[]>([]);
  const [occurrences, setOccurrences] = useState<KajianOccurrence[]>([]);
  const [petugas, setPetugas] = useState<PetugasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [topic, setTopic] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("Masjid");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [rescheduleTarget, setRescheduleTarget] =
    useState<RescheduleTarget | null>(null);
  const [newStart, setNewStart] = useState("");
  const [newNote, setNewNote] = useState("");
  const [moving, setMoving] = useState(false);

  async function load() {
    try {
      const [res, pRes] = await Promise.all([
        fetch("/api/kajian", { cache: "no-store" }),
        fetch("/api/petugas", { cache: "no-store" }),
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal memuat kajian");
      setItems(Array.isArray(data.items) ? data.items : []);
      setOccurrences(Array.isArray(data.occurrences) ? data.occurrences : []);

      const petugasData = await pRes.json().catch(() => ({}));
      if (!pRes.ok) {
        throw new Error(petugasData?.error || "Gagal memuat daftar petugas");
      }
      setPetugas(petugasData);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat kajian");
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
    setIsRecurring(false);
    setRecurrenceUntil("");
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
    setIsRecurring(item.isRecurring);
    setRecurrenceUntil(item.recurrenceUntil?.slice(0, 10) ?? "");
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
            startDateTime: fromWibInput(start).toISOString(),
            endDateTime: end ? fromWibInput(end).toISOString() : null,
            location,
            description: description || null,
            isRecurring,
            recurrenceUntil: isRecurring ? recurrenceUntil || null : null,
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

  function openReschedule(target: RescheduleTarget, currentStart: string) {
    setRescheduleTarget(target);
    setNewStart(toLocalInput(currentStart));
    setNewNote("");
  }

  function closeReschedule() {
    setRescheduleTarget(null);
    setNewStart("");
    setNewNote("");
  }

  async function saveReschedule() {
    if (!rescheduleTarget) return;
    if (!newStart) return toast.error("Waktu baru wajib diisi");
    setMoving(true);
    try {
      const res = await fetch(
        `/api/kajian/${rescheduleTarget.kajianId}/reschedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occurrenceDate: rescheduleTarget.occurrenceDate,
            newStartDateTime: fromWibInput(newStart).toISOString(),
            note: newNote || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memindahkan jadwal");
      toast.success("Jadwal pertemuan dipindahkan");
      closeReschedule();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memindahkan jadwal");
    } finally {
      setMoving(false);
    }
  }

  async function restoreOccurrence(kajianId: string, occurrenceDate: string) {
    if (!confirm("Kembalikan pertemuan ini ke jadwal semula?")) return;
    try {
      const res = await fetch(
        `/api/kajian/${kajianId}/reschedule?occurrenceDate=${encodeURIComponent(
          occurrenceDate
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengembalikan jadwal");
      toast.success("Jadwal pertemuan dikembalikan");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengembalikan jadwal");
    }
  }

  function renderRescheduleForm() {
    return (
      <div className="mt-2 rounded-xl border border-sage-300 bg-white p-3 shadow-sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-sage-700">
          {rescheduleTarget?.label}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="newStart">Hari &amp; jam baru</Label>
            <Input
              id="newStart"
              type="datetime-local"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="newNote">Catatan (opsional)</Label>
            <Input
              id="newNote"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Contoh: diundur karena acara takmir"
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button onClick={saveReschedule} disabled={moving}>
            <CalendarClock className="h-3.5 w-3.5" />
            {moving ? "Menyimpan..." : "Simpan Jadwal Baru"}
          </Button>
          <Button variant="secondary" onClick={closeReschedule}>
            Batal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={BookMarked}
        title="Jadwal Kajian"
        description="Kelola kajian rutin mingguan, kajian insidentil, dan pemindahan jadwal yang tampil di web serta TV masjid."
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
            <PetugasSelect
              id="speaker"
              value={speaker}
              onChange={setSpeaker}
              roleFilter="PEMATERI"
              placeholder="Pilih Pemateri..."
              petugasList={petugas}
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
            <Label htmlFor="start">
              {isRecurring ? "Pertemuan Pertama" : "Mulai"}
            </Label>
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
          <div>
            <Label htmlFor="recurrenceUntil">Berlaku Sampai (opsional)</Label>
            <Input
              id="recurrenceUntil"
              type="date"
              value={recurrenceUntil}
              onChange={(e) => setRecurrenceUntil(e.target.value)}
              disabled={!isRecurring}
            />
          </div>
          <div className="sm:col-span-2">
            <Toggle
              checked={isRecurring}
              onChange={setIsRecurring}
              label="Jadwal tetap (berulang setiap pekan)"
              description={
                isRecurring && start
                  ? `Kajian otomatis muncul setiap ${weekdayName(
                      fromWibInput(start).toISOString()
                    )} pada jam yang sama, tanpa perlu input tanggal lagi.`
                  : "Aktifkan untuk kajian rutin mingguan. Tanggal pertama di atas menjadi acuan hari pengulangan."
              }
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
          items.map((item) => {
            const itemOccurrences = occurrences.filter(
              (o) => o.kajianId === item.id
            );
            const oneOffOccurrenceDate = ymdWib(item.startDateTime);

            return (
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
                      {item.isRecurring && (
                        <Badge color="blue">
                          <Repeat className="h-3 w-3" />
                          Tetap · Setiap {weekdayLabel(item.recurrenceDay)}
                        </Badge>
                      )}
                      {item.rescheduledFrom && (
                        <Badge color="amber">Dipindahkan</Badge>
                      )}
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
                        {item.isRecurring
                          ? `Setiap ${weekdayLabel(item.recurrenceDay)}, ${formatTime(
                              item.startDateTime
                            )} WIB`
                          : formatDateTime(item.startDateTime)}
                      </span>
                    </div>

                    {item.isRecurring && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Mulai {formatDateOnly(ymdWib(item.startDateTime))}
                        {item.recurrenceUntil
                          ? ` · berakhir ${formatDateOnly(item.recurrenceUntil)}`
                          : " · tanpa batas akhir"}
                      </p>
                    )}

                    {item.rescheduledFrom && !item.isRecurring && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        Dipindahkan dari {formatDateTime(item.rescheduledFrom)}
                      </p>
                    )}

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

                    {item.isRecurring ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Pertemuan Mendatang
                        </p>
                        {itemOccurrences.length === 0 ? (
                          <p className="mt-1.5 text-xs text-slate-500">
                            Belum ada pertemuan mendatang. Periksa tanggal
                            mulai dan tanggal berakhir pengulangan.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {itemOccurrences.map((o) => (
                              <li key={o.id}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="text-xs text-slate-700">
                                    <span className="font-semibold">
                                      {formatDateTime(o.startDateTime)}
                                    </span>
                                    {o.isException && (
                                      <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                        Dipindahkan dari{" "}
                                        {formatDateOnly(o.occurrenceDate)}
                                      </span>
                                    )}
                                    {o.exceptionNote && (
                                      <span className="ml-1 text-[11px] text-slate-500">
                                        · {o.exceptionNote}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-1.5">
                                    {o.isException && (
                                      <Button
                                        variant="ghost"
                                        onClick={() =>
                                          restoreOccurrence(
                                            item.id,
                                            o.occurrenceDate
                                          )
                                        }
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Kembalikan
                                      </Button>
                                    )}
                                    <Button
                                      variant="secondary"
                                      onClick={() =>
                                        openReschedule(
                                          {
                                            kajianId: item.id,
                                            occurrenceDate: o.occurrenceDate,
                                            label: `Pindahkan pertemuan ${formatDateOnly(
                                              o.occurrenceDate
                                            )}`,
                                          },
                                          o.startDateTime
                                        )
                                      }
                                    >
                                      <CalendarClock className="h-3.5 w-3.5" />
                                      Pindahkan
                                    </Button>
                                  </div>
                                </div>
                                {rescheduleTarget?.kajianId === item.id &&
                                  rescheduleTarget.occurrenceDate ===
                                    o.occurrenceDate &&
                                  renderRescheduleForm()}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              openReschedule(
                                {
                                  kajianId: item.id,
                                  occurrenceDate: oneOffOccurrenceDate,
                                  label: "Pindahkan kajian ini",
                                },
                                item.startDateTime
                              )
                            }
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            Pindahkan
                          </Button>
                          {item.rescheduledFrom && (
                            <Button
                              variant="ghost"
                              onClick={() =>
                                restoreOccurrence(
                                  item.id,
                                  oneOffOccurrenceDate
                                )
                              }
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Kembalikan ke tanggal semula
                            </Button>
                          )}
                        </div>
                        {rescheduleTarget?.kajianId === item.id &&
                          rescheduleTarget.occurrenceDate ===
                            oneOffOccurrenceDate &&
                          renderRescheduleForm()}
                      </div>
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
            );
          })
        )}
      </div>
    </div>
  );
}
