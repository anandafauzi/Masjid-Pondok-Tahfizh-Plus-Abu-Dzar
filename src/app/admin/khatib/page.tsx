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
} from "@/components/ui";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";

import { PetugasItem } from "@/types/petugas";
import { PetugasSelect } from "@/components/admin/petugas-select";

interface Rolling {
  id: string;
  khatibName: string;
  sequenceNumber: number;
  effectiveFrom: string;
  isActive: boolean;
}

interface Schedule {
  id: string;
  fridayDate: string;
  khatibName: string;
  sermonTopic: string | null;
  backupKhatibName: string | null;
}

const toYmd = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const todayYmd = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );

export default function AdminKhatibPage() {
  const [rolling, setRolling] = useState<Rolling[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [petugas, setPetugas] = useState<PetugasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const [rollName, setRollName] = useState("");
  const [rollFrom, setRollFrom] = useState(todayYmd());
  const [editingRollingId, setEditingRollingId] = useState<string | null>(null);

  const [date, setDate] = useState(todayYmd());
  const [khatib, setKhatib] = useState("");
  const [topic, setTopic] = useState("");
  const [backup, setBackup] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      const [r, s, p] = await Promise.all([
        fetch("/api/khatib-rolling", { cache: "no-store" }),
        fetch("/api/khatib-schedules", { cache: "no-store" }),
        fetch("/api/petugas", { cache: "no-store" }),
      ]);
      if (r.ok) setRolling(await r.json());
      if (s.ok) setSchedules(await s.json());
      if (p.ok) setPetugas(await p.json());
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetRollingForm() {
    setRollName("");
    setRollFrom(todayYmd());
    setEditingRollingId(null);
  }

  function beginEditRolling(r: Rolling) {
    setRollName(r.khatibName);
    setRollFrom(toYmd(r.effectiveFrom));
    setEditingRollingId(r.id);
  }

  async function submitRolling() {
    if (!rollName.trim()) return toast.error("Nama khatib wajib diisi");
    setSaving(true);
    try {
      const url = editingRollingId
        ? `/api/khatib-rolling/${editingRollingId}`
        : "/api/khatib-rolling";
      const method = editingRollingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ khatibName: rollName, effectiveFrom: rollFrom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success(
        editingRollingId
          ? "Rotasi khatib berhasil diperbarui"
          : "Khatib rotasi ditambahkan"
      );
      resetRollingForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function delRolling(id: string) {
    if (!confirm("Hapus khatib dari daftar rolling?")) return;
    try {
      await fetch(`/api/khatib-rolling/${id}`, { method: "DELETE" });
      await load();
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  async function moveRolling(id: string, direction: "up" | "down") {
    setOrdering(true);
    try {
      const res = await fetch("/api/khatib-rolling/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, direction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah urutan");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah urutan");
    } finally {
      setOrdering(false);
    }
  }

  function resetScheduleForm() {
    setDate(todayYmd());
    setKhatib("");
    setTopic("");
    setBackup("");
    setEditingId(null);
  }

  function beginEdit(s: Schedule) {
    setDate(toYmd(s.fridayDate));
    setKhatib(s.khatibName);
    setTopic(s.sermonTopic ?? "");
    setBackup(s.backupKhatibName ?? "");
    setEditingId(s.id);
  }

  async function submitSchedule() {
    if (!khatib.trim()) return toast.error("Nama khatib wajib diisi");
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/khatib-schedules/${editingId}` : "/api/khatib-schedules",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fridayDate: date,
            khatibName: khatib,
            sermonTopic: topic || null,
            backupKhatibName: backup || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success(
        editingId ? "Jadwal diperbarui" : "Jadwal khatib ditambahkan"
      );
      resetScheduleForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function delSchedule(id: string) {
    if (!confirm("Hapus jadwal khatib ini?")) return;
    try {
      await fetch(`/api/khatib-schedules/${id}`, { method: "DELETE" });
      if (editingId === id) resetScheduleForm();
      await load();
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Khatib Jumat"
        description="Kelola rotasi khatib dan jadwal khutbah Jumat."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <SectionHeading
            icon={UserCheck}
            title="Rotasi Khatib"
            description="Urutan rotasi mengikuti daftar dari atas ke bawah. Gunakan tombol panah untuk mengubah urutan."
          />
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <Label htmlFor="rollName">Nama Khatib</Label>
              <PetugasSelect
                id="rollName"
                value={rollName}
                onChange={setRollName}
                roleFilter="KHATIB"
                placeholder="Pilih Khatib..."
                petugasList={petugas}
              />
            </div>
            <div>
              <Label htmlFor="rollFrom">Berlaku Sejak</Label>
              <Input
                id="rollFrom"
                type="date"
                value={rollFrom}
                onChange={(e) => setRollFrom(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              <Button onClick={submitRolling} disabled={saving}>
                {editingRollingId ? (
                  <>
                    <Pencil className="h-4 w-4" /> Simpan
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Tambah
                  </>
                )}
              </Button>
              {editingRollingId && (
                <Button variant="secondary" onClick={resetRollingForm}>
                  Batal
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : rolling.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
              Belum ada data rotasi khatib.
            </p>
          ) : (
            <ul className="space-y-2">
              {rolling.map((r, index) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 transition-colors hover:border-amber-200 hover:bg-amber-50/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-800 ring-1 ring-amber-200">
                      {r.sequenceNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {r.khatibName}
                        </p>
                        {!r.isActive && <Badge color="slate">Nonaktif</Badge>}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Sejak {toYmd(r.effectiveFrom)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                      onClick={() => beginEditRolling(r)}
                      title="Edit Rotasi Khatib"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      onClick={() => moveRolling(r.id, "up")}
                      disabled={ordering || index === 0}
                      aria-label={`Naikkan urutan ${r.khatibName}`}
                      title="Naikkan urutan"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      onClick={() => moveRolling(r.id, "down")}
                      disabled={ordering || index === rolling.length - 1}
                      aria-label={`Turunkan urutan ${r.khatibName}`}
                      title="Turunkan urutan"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <Button
                      variant="danger"
                      className="ml-1 px-3 py-1.5"
                      onClick={() => delRolling(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Hapus</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-w-0">
          <SectionHeading
            icon={BookOpen}
            title="Jadwal Khutbah Jumat"
            description="Jadwal khatib untuk tanggal Jumat tertentu."
          />
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="fridayDate">Tanggal Jumat</Label>
              <Input
                id="fridayDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="khatib">Nama Khatib</Label>
              <PetugasSelect
                id="khatib"
                value={khatib}
                onChange={setKhatib}
                roleFilter="KHATIB"
                placeholder="Pilih Khatib..."
                petugasList={petugas}
              />
            </div>
            <div>
              <Label htmlFor="topic">Tema Khutbah</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div>
              <Label htmlFor="backup">Khatib Cadangan</Label>
              <PetugasSelect
                id="backup"
                value={backup}
                onChange={setBackup}
                roleFilter="KHATIB"
                placeholder="Pilih Khatib Cadangan..."
                petugasList={petugas}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={submitSchedule} disabled={saving}>
              {editingId ? (
                <>
                  <Pencil className="h-4 w-4" /> Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Tambah Jadwal
                </>
              )}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={resetScheduleForm}>
                Batal
              </Button>
            )}
          </div>

          <div className="mt-5 max-h-80 overflow-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Tanggal</th>
                  <th className="px-3 py-2.5">Khatib</th>
                  <th className="px-3 py-2.5">Tema</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                      Belum ada jadwal khatib.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-amber-50/40"
                    >
                      <td className="px-3 py-2.5 text-slate-600">
                        {toYmd(s.fridayDate)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {s.khatibName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {s.sermonTopic ?? "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                            onClick={() => beginEdit(s)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
                            onClick={() => delSchedule(s.id)}
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
