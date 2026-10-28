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
  Select,
} from "@/components/ui";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

interface Rolling {
  id: string;
  imamName: string;
  sequenceNumber: number;
  effectiveFrom: string;
  isActive: boolean;
}

interface Schedule {
  id: string;
  scheduleDate: string;
  prayerName: string;
  imamName: string;
  muadzinName: string;
  notes: string | null;
}

const PRAYERS = ["Subuh", "Zuhur", "Asar", "Magrib", "Isya"];
const toYmd = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const todayYmd = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );

export default function AdminImamPage() {
  const [rolling, setRolling] = useState<Rolling[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const [rollName, setRollName] = useState("");
  const [rollFrom, setRollFrom] = useState(todayYmd());

  const [date, setDate] = useState(todayYmd());
  const [prayer, setPrayer] = useState("Subuh");
  const [imam, setImam] = useState("");
  const [muadzin, setMuadzin] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      const [r, s] = await Promise.all([
        fetch("/api/imam-rolling", { cache: "no-store" }),
        fetch("/api/imam-schedules", { cache: "no-store" }),
      ]);
      if (r.ok) setRolling(await r.json());
      if (s.ok) setSchedules(await s.json());
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addRolling() {
    if (!rollName.trim()) return toast.error("Nama imam wajib diisi");
    setSaving(true);
    try {
      const res = await fetch("/api/imam-rolling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imamName: rollName, effectiveFrom: rollFrom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah");
      setRollName("");
      toast.success("Imam rolling ditambahkan");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah");
    } finally {
      setSaving(false);
    }
  }

  async function delRolling(id: string) {
    if (!confirm("Hapus imam dari daftar rolling?")) return;
    try {
      await fetch(`/api/imam-rolling/${id}`, { method: "DELETE" });
      await load();
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  async function moveRolling(id: string, direction: "up" | "down") {
    setOrdering(true);
    try {
      const res = await fetch("/api/imam-rolling/reorder", {
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
    setPrayer("Subuh");
    setImam("");
    setMuadzin("");
    setNotes("");
    setEditingId(null);
  }

  async function submitSchedule() {
    if (!imam.trim() || !muadzin.trim())
      return toast.error("Nama imam dan muadzin wajib diisi");
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/imam-schedules/${editingId}` : "/api/imam-schedules",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduleDate: date,
            prayerName: prayer,
            imamName: imam,
            muadzinName: muadzin,
            notes: notes || null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success(editingId ? "Jadwal diperbarui" : "Jadwal ditambahkan");
      resetScheduleForm();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(s: Schedule) {
    setDate(toYmd(s.scheduleDate));
    setPrayer(s.prayerName);
    setImam(s.imamName);
    setMuadzin(s.muadzinName);
    setNotes(s.notes ?? "");
    setEditingId(s.id);
  }

  async function delSchedule(id: string) {
    if (!confirm("Hapus jadwal ini?")) return;
    try {
      await fetch(`/api/imam-schedules/${id}`, { method: "DELETE" });
      if (editingId === id) resetScheduleForm();
      await load();
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Imam & Muadzin"
        description="Atur rotasi imam Subuh Jumat dan jadwal petugas harian."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <SectionHeading
            icon={UserCheck}
            title="Rotasi Imam Subuh Jumat"
            description="Urutan rotasi mengikuti daftar dari atas ke bawah. Gunakan tombol panah untuk mengubah urutan."
          />
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <Label htmlFor="rollName">Nama Imam</Label>
              <Input
                id="rollName"
                value={rollName}
                onChange={(e) => setRollName(e.target.value)}
                placeholder="Nama ustadz"
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
            <Button onClick={addRolling} disabled={saving}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          </div>

          {loading ? (
            <LoadingState />
          ) : rolling.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-slate-500">
              Belum ada data rotasi imam.
            </p>
          ) : (
            <ul className="space-y-2">
              {rolling.map((r, index) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
                      {r.sequenceNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {r.imamName}
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
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      onClick={() => moveRolling(r.id, "up")}
                      disabled={ordering || index === 0}
                      aria-label={`Naikkan urutan ${r.imamName}`}
                      title="Naikkan urutan"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                      onClick={() => moveRolling(r.id, "down")}
                      disabled={ordering || index === rolling.length - 1}
                      aria-label={`Turunkan urutan ${r.imamName}`}
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
            icon={Users}
            title="Jadwal Harian"
            description="Jadwal petugas untuk tanggal tertentu."
          />
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="schedDate">Tanggal</Label>
              <Input
                id="schedDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="prayer">Shalat</Label>
              <Select
                id="prayer"
                value={prayer}
                onChange={(e) => setPrayer(e.target.value)}
              >
                {PRAYERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="imam">Imam</Label>
              <Input
                id="imam"
                value={imam}
                onChange={(e) => setImam(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="muadzin">Muadzin</Label>
              <Input
                id="muadzin"
                value={muadzin}
                onChange={(e) => setMuadzin(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsional"
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
                  <th className="px-3 py-2.5">Shalat</th>
                  <th className="px-3 py-2.5">Imam</th>
                  <th className="px-3 py-2.5">Muadzin</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      Belum ada jadwal.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-emerald-50/40"
                    >
                      <td className="px-3 py-2.5 text-slate-600">
                        {toYmd(s.scheduleDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800">
                          {s.prayerName}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {s.imamName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {s.muadzinName}
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
