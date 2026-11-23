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
  CalendarOff,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";

import { PetugasItem } from "@/types/petugas";
import { PetugasSelect } from "@/components/admin/petugas-select";
import {
  addDaysUTC,
  dateOnlyToString,
  dateOnlyToUTC,
  formatDateOnlyShort,
  nextFriday,
  toDateOnlyString,
} from "@/lib/datetime";
import { resolveRolling } from "@/lib/rolling";

interface Rolling {
  id: string;
  khatibName: string;
  sequenceNumber: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
}

type RotationEffect = "SKIP" | "POSTPONE";

interface Schedule {
  id: string;
  fridayDate: string;
  khatibName: string;
  sermonTopic: string | null;
  backupKhatibName: string | null;
  isHoliday: boolean;
  rotationEffect?: RotationEffect;
}

const toYmd = (iso: string) => dateOnlyToString(new Date(iso));
const todayYmd = () => toDateOnlyString(new Date());

/** Jumat berikutnya; jika hari ini Jumat, pakai pekan depan. */
const nextFridayYmd = () => {
  const friday = nextFriday();
  return dateOnlyToString(
    dateOnlyToString(friday) === todayYmd() ? addDaysUTC(friday, 7) : friday
  );
};

function isFridayYmd(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    dateOnlyToUTC(value).getUTCDay() === 5
  );
}

export default function AdminKhatibPage() {
  const [rolling, setRolling] = useState<Rolling[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [petugas, setPetugas] = useState<PetugasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const [rollName, setRollName] = useState("");
  const [rollFrom, setRollFrom] = useState(todayYmd());
  const [rollUntil, setRollUntil] = useState("");
  const [rollActive, setRollActive] = useState(true);
  const [editingRollingId, setEditingRollingId] = useState<string | null>(null);

  const [date, setDate] = useState(nextFridayYmd);
  const [khatib, setKhatib] = useState("");
  const [topic, setTopic] = useState("");
  const [backup, setBackup] = useState("");
  const [holiday, setHoliday] = useState(false);
  const [rotationEffect, setRotationEffect] = useState<RotationEffect>("SKIP");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fridayValid = isFridayYmd(date);
  const existingForDate =
    schedules.find((s) => toYmd(s.fridayDate) === date) ?? null;
  const isExistingDifferent = Boolean(
    existingForDate && existingForDate.id !== editingId
  );
  const holidayDates = schedules
    .filter((s) => s.isHoliday)
    .map((s) => toYmd(s.fridayDate));
  const pauseDates = schedules
    .filter((s) => s.isHoliday || s.rotationEffect === "POSTPONE")
    .map((s) => toYmd(s.fridayDate));
  // Preview mengikuti form aktif agar admin melihat dampak sebelum simpan.
  const previewPauseDates = (() => {
    if (!fridayValid) return pauseDates;
    const next = pauseDates.filter((d) => d !== date);
    const formPausesRotation = holiday || (!holiday && rotationEffect === "POSTPONE");
    if (formPausesRotation) next.push(date);
    return next;
  })();
  const isHolidayForDate = holidayDates.includes(date);
  const rollingForDate = fridayValid
    ? resolveRolling(rolling, dateOnlyToUTC(date), previewPauseDates)
    : null;

  async function load() {
    try {
      const [r, s, p] = await Promise.all([
        fetch("/api/khatib-rolling", { cache: "no-store" }),
        fetch("/api/khatib-schedules?from=1970-01-01", { cache: "no-store" }),
        fetch("/api/petugas", { cache: "no-store" }),
      ]);
      if (!r.ok || !s.ok || !p.ok) {
        throw new Error("Gagal memuat data");
      }
      setRolling(await r.json());
      setSchedules(await s.json());
      setPetugas(await p.json());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat data");
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
    setRollUntil("");
    setRollActive(true);
    setEditingRollingId(null);
  }

  function beginEditRolling(r: Rolling) {
    setRollName(r.khatibName);
    setRollFrom(toYmd(r.effectiveFrom));
    setRollUntil(r.effectiveUntil ? toYmd(r.effectiveUntil) : "");
    setRollActive(r.isActive);
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
        body: JSON.stringify({
          khatibName: rollName,
          effectiveFrom: rollFrom,
          effectiveUntil: rollUntil || null,
          isActive: rollActive,
        }),
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
      const res = await fetch(`/api/khatib-rolling/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus");
      }
      await load();
      toast.success("Khatib rotasi dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
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
    setDate(nextFridayYmd());
    setKhatib("");
    setTopic("");
    setBackup("");
    setHoliday(false);
    setRotationEffect("SKIP");
    setEditingId(null);
  }

  function beginEdit(s: Schedule) {
    setDate(toYmd(s.fridayDate));
    setKhatib(s.isHoliday ? "" : s.khatibName);
    setTopic(s.sermonTopic ?? "");
    setBackup(s.backupKhatibName ?? "");
    setHoliday(s.isHoliday);
    setRotationEffect(s.rotationEffect ?? "SKIP");
    setEditingId(s.id);
  }

  async function submitSchedule() {
    if (!fridayValid) return toast.error("Tanggal harus berupa hari Jumat");
    if (!holiday && !khatib.trim()) {
      return toast.error("Nama khatib wajib diisi");
    }
    if (isExistingDifferent) {
      return toast.error(
        "Jadwal untuk tanggal ini sudah ada. Klik Edit Jadwal Ini."
      );
    }
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/khatib-schedules/${editingId}` : "/api/khatib-schedules",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fridayDate: date,
            khatibName: holiday ? "Libur" : khatib,
            sermonTopic: topic || null,
            backupKhatibName: backup || null,
            isHoliday: holiday,
            rotationEffect: holiday ? "SKIP" : rotationEffect,
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

  /** Simpan cepat status Masjid Libur untuk tanggal yang sedang dipilih. */
  async function saveHoliday() {
    if (!fridayValid) return toast.error("Tanggal harus berupa hari Jumat");
    const existing = schedules.find((s) => toYmd(s.fridayDate) === date);
    setSaving(true);
    try {
      const res = await fetch(
        existing
          ? `/api/khatib-schedules/${existing.id}`
          : "/api/khatib-schedules",
        {
          method: existing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fridayDate: date,
            khatibName: "Libur",
            isHoliday: true,
            sermonTopic: null,
            backupKhatibName: null,
            rotationEffect: "SKIP",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success("Masjid Libur tersimpan");
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
      const res = await fetch(`/api/khatib-schedules/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus");
      }
      if (editingId === id) resetScheduleForm();
      await load();
      toast.success("Jadwal khatib dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <div>
      <PageHeader
        icon={BookOpen}
        title="Khatib Jumat"
        description="Kelola rotasi khatib dan jadwal khutbah Jumat."
      />

      <div className="space-y-6">
        <Card className="min-w-0">
          <SectionHeading
            icon={UserCheck}
            title="Rotasi Khatib"
            description="Urutan rotasi mengikuti daftar dari atas ke bawah. Gunakan tombol panah untuk mengubah urutan."
          />
          <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0">
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
            <div className="min-w-0">
              <Label htmlFor="rollFrom">Berlaku Sejak</Label>
              <Input
                id="rollFrom"
                type="date"
                value={rollFrom}
                onChange={(e) => setRollFrom(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="rollUntil">Berlaku Sampai (opsional)</Label>
              <Input
                id="rollUntil"
                type="date"
                value={rollUntil}
                onChange={(e) => setRollUntil(e.target.value)}
              />
            </div>
            <div className="flex min-w-0 items-end">
              <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={rollActive}
                  onChange={(e) => setRollActive(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 accent-sage-600"
                />
                <span className="truncate">Ikut Rotasi</span>
              </label>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2 sm:col-span-2 xl:col-span-4">
              <Button onClick={submitRolling} disabled={saving || ordering}>
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 transition-colors hover:border-amber-200 hover:bg-amber-50/30"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
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
                        {r.effectiveUntil
                          ? ` • s/d ${toYmd(r.effectiveUntil)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-30"
                      onClick={() => beginEditRolling(r)}
                      disabled={saving || ordering}
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
                      disabled={saving || ordering}
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
          <div className="mb-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <Label htmlFor="fridayDate">Tanggal Jumat</Label>
              <Input
                id="fridayDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {!fridayValid && date && (
                <p className="mt-1 text-[11px] font-semibold text-rose-600">
                  Tanggal harus berupa hari Jumat.
                </p>
              )}
              {fridayValid && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Rotasi:{" "}
                  <span className="font-semibold text-slate-700">
                    {isHolidayForDate
                      ? "Masjid Libur (rolling berhenti)"
                      : (rollingForDate?.name ?? "Belum ada")}
                  </span>
                  {existingForDate && !isHolidayForDate
                    ? existingForDate.rotationEffect === "POSTPONE"
                      ? " • manual (rotasi mundur)"
                      : " • manual (rotasi terlewat)"
                    : ""}
                </p>
              )}
            </div>
            <div className="min-w-0 sm:col-span-2">
              <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs font-bold text-amber-900">
                <input
                  id="masjidLibur"
                  type="checkbox"
                  checked={holiday}
                  onChange={(e) => setHoliday(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-amber-300 accent-amber-600"
                />
                <CalendarOff className="h-4 w-4 shrink-0" />
                <span>Masjid Libur</span>
              </label>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Centang jika Jumat ini masjid libur. Rolling khatib berhenti dan
                akan lanjut dari jadwal terakhir setelah aktif lagi.
              </p>
              {holiday && (
                <Button
                  className="mt-2 w-full"
                  onClick={saveHoliday}
                  disabled={saving || !fridayValid}
                >
                  <CalendarOff className="h-4 w-4" /> Simpan Masjid Libur
                </Button>
              )}
            </div>
            {!holiday && (
              <div className="min-w-0 sm:col-span-2">
                <Label>Dampak ke Rotasi Khatib</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs ${rotationEffect === "POSTPONE" ? "border-emerald-300 bg-emerald-50/70 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}>
                    <input
                      type="radio"
                      name="rotationEffect"
                      value="POSTPONE"
                      checked={rotationEffect === "POSTPONE"}
                      onChange={() => setRotationEffect("POSTPONE")}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                    />
                    <span>
                      <span className="font-bold">Mundur ke Jumat berikutnya</span>
                      <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-slate-500">
                        Petugas rotasi yang seharusnya bertugas pekan ini digeser ke Jumat berikutnya yang tersedia.
                      </span>
                    </span>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs ${rotationEffect === "SKIP" ? "border-amber-300 bg-amber-50/70 text-amber-900" : "border-slate-200 bg-white text-slate-700"}`}>
                    <input
                      type="radio"
                      name="rotationEffect"
                      value="SKIP"
                      checked={rotationEffect === "SKIP"}
                      onChange={() => setRotationEffect("SKIP")}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                    />
                    <span>
                      <span className="font-bold">Langsung terlewat (skip)</span>
                      <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-slate-500">
                        Rotasi tetap maju; petugas rotasi pekan ini tidak mendapat giliran pengganti.
                      </span>
                    </span>
                  </label>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  Berlaku saat Anda menyimpan jadwal khatib manual untuk pekan ini.
                </p>
              </div>
            )}
            <div className="min-w-0">
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
            <div className="min-w-0">
              <Label htmlFor="topic">Tema Khutbah</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="min-w-0">
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
          {isExistingDifferent && existingForDate && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Jadwal tanggal ini sudah ada:{" "}
              <strong>{existingForDate.khatibName}</strong>.{" "}
              <button
                type="button"
                className="font-bold underline"
                onClick={() => beginEdit(existingForDate)}
              >
                Edit jadwal ini
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={submitSchedule}
              disabled={saving || !fridayValid || isExistingDifferent}
            >
              {holiday ? (
                <>
                  <CalendarOff className="h-4 w-4" /> Simpan Jadwal Libur
                </>
              ) : editingId ? (
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

          <div className="mt-5 max-h-80 max-w-full overflow-auto rounded-xl border border-slate-100">
            <table className="w-full table-auto text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Tanggal</th>
                  <th className="px-3 py-2.5">Khatib</th>
                  <th className="px-3 py-2.5">Cadangan</th>
                  <th className="px-3 py-2.5">Tema</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                      Belum ada jadwal khatib.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-amber-50/40"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                        {formatDateOnlyShort(new Date(s.fridayDate))}
                      </td>
                      <td className="break-words px-3 py-2.5 font-semibold text-slate-800">
                        {s.isHoliday ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                            <CalendarOff className="h-3 w-3" /> Masjid Libur
                          </span>
                        ) : (
                          <div>
                            <div>{s.khatibName}</div>
                            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {s.rotationEffect === "POSTPONE"
                                ? "Rotasi mundur"
                                : "Rotasi terlewat"}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="break-words px-3 py-2.5 text-slate-500">
                        {s.backupKhatibName ?? "-"}
                      </td>
                      <td className="break-words px-3 py-2.5 text-slate-500">
                        {s.sermonTopic ?? "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-30"
                            onClick={() => beginEdit(s)}
                            disabled={saving}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                            onClick={() => delSchedule(s.id)}
                            disabled={saving}
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
