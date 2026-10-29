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
  Calendar,
  CalendarCheck,
  Check,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { DAYS_OF_WEEK, PRAYERS, WeeklyImamItem } from "@/types/weekly-imam";

import { PetugasItem } from "@/types/petugas";
import { ScheduleExportActions } from "@/components/schedule-export-actions";
import { PetugasSelect } from "@/components/admin/petugas-select";

interface Rolling {
  id: string;
  imamName: string;
  sequenceNumber: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
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

const toYmd = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const todayYmd = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );

export default function AdminImamPage() {
  const [activeTab, setActiveTab] = useState<"weekly" | "rolling" | "daily">("weekly");
  const [weeklyItems, setWeeklyItems] = useState<WeeklyImamItem[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(1); // 1 = Senin
  const [rolling, setRolling] = useState<Rolling[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [petugas, setPetugas] = useState<PetugasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ordering, setOrdering] = useState(false);

  // Rolling form state
  const [rollName, setRollName] = useState("");
  const [rollFrom, setRollFrom] = useState(todayYmd());
  const [rollPermanent, setRollPermanent] = useState(true);
  const [rollUntil, setRollUntil] = useState("");
  const [editingRollingId, setEditingRollingId] = useState<string | null>(null);

  // Daily Schedule form state
  const [date, setDate] = useState(todayYmd());
  const [prayer, setPrayer] = useState("Subuh");
  const [imam, setImam] = useState("");
  const [muadzin, setMuadzin] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    try {
      const [w, r, s, p] = await Promise.all([
        fetch("/api/imam-weekly", { cache: "no-store" }),
        fetch("/api/imam-rolling", { cache: "no-store" }),
        fetch("/api/imam-schedules", { cache: "no-store" }),
        fetch("/api/petugas", { cache: "no-store" }),
      ]);
      if (w.ok) setWeeklyItems(await w.json());
      if (r.ok) setRolling(await r.json());
      if (s.ok) setSchedules(await s.json());
      if (p.ok) setPetugas(await p.json());
    } catch {
      toast.error("Gagal memuat data imam");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // --- WEEKLY SCHEDULE LOGIC ---
  function getWeeklyPrayer(day: number, prayerName: string): WeeklyImamItem {
    const found = weeklyItems.find(
      (item) => item.dayOfWeek === day && item.prayerName === prayerName
    );
    if (found) return found;

    return {
      id: `weekly-${day}-${prayerName}`,
      dayOfWeek: day,
      prayerName,
      imamName: "",
      muadzinName: "",
      isPermanent: true,
      effectiveFrom: todayYmd(),
      effectiveUntil: null,
      notes: null,
      isActive: true,
    };
  }

  function updateWeeklyField(
    day: number,
    prayerName: string,
    field: keyof WeeklyImamItem,
    value: unknown
  ) {
    setWeeklyItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.dayOfWeek === day && i.prayerName === prayerName
      );
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], [field]: value };
        return copy;
      } else {
        const newItem: WeeklyImamItem = {
          id: `weekly-${day}-${prayerName}`,
          dayOfWeek: day,
          prayerName,
          imamName: "",
          muadzinName: "",
          isPermanent: true,
          effectiveFrom: todayYmd(),
          effectiveUntil: null,
          notes: null,
          isActive: true,
          [field]: value,
        };
        return [...prev, newItem];
      }
    });
  }

  async function saveWeeklySchedule() {
    setSaving(true);
    try {
      const res = await fetch("/api/imam-weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: weeklyItems, syncDays: 14 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan jadwal pekanan");
      toast.success("Jadwal imam pekanan berhasil disimpan & disinkronkan!");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  function copyCurrentDayToAllDays() {
    const currentDayItems = PRAYERS.map((p) => getWeeklyPrayer(selectedDay, p));
    const confirmCopy = confirm(
      `Salin seluruh penugasan hari ${
        DAYS_OF_WEEK.find((d) => d.value === selectedDay)?.name
      } ke seluruh hari lainnya (Senin s/d Ahad)?`
    );
    if (!confirmCopy) return;

    setWeeklyItems((prev) => {
      const newItems = [...prev];
      for (const d of DAYS_OF_WEEK) {
        if (d.value === selectedDay) continue;
        for (const p of currentDayItems) {
          const idx = newItems.findIndex(
            (i) => i.dayOfWeek === d.value && i.prayerName === p.prayerName
          );
          const cloned: WeeklyImamItem = {
            ...p,
            id: `weekly-${d.value}-${p.prayerName}`,
            dayOfWeek: d.value,
          };
          if (idx !== -1) {
            newItems[idx] = cloned;
          } else {
            newItems.push(cloned);
          }
        }
      }
      return newItems;
    });

    toast.success("Jadwal disalin ke seluruh hari. Jangan lupa klik Simpan!");
  }

  // --- ROLLING LOGIC ---
  function resetRollingForm() {
    setRollName("");
    setRollFrom(todayYmd());
    setRollUntil("");
    setRollPermanent(true);
    setEditingRollingId(null);
  }

  function beginEditRolling(r: Rolling) {
    setRollName(r.imamName);
    setRollFrom(toYmd(r.effectiveFrom));
    if (r.effectiveUntil) {
      setRollPermanent(false);
      setRollUntil(toYmd(r.effectiveUntil));
    } else {
      setRollPermanent(true);
      setRollUntil("");
    }
    setEditingRollingId(r.id);
  }

  async function submitRolling() {
    if (!rollName.trim()) return toast.error("Nama imam wajib diisi");
    setSaving(true);
    try {
      const url = editingRollingId
        ? `/api/imam-rolling/${editingRollingId}`
        : "/api/imam-rolling";
      const method = editingRollingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imamName: rollName,
          effectiveFrom: rollFrom,
          effectiveUntil: rollPermanent ? null : rollUntil || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      resetRollingForm();
      toast.success(
        editingRollingId
          ? "Rotasi imam berhasil diperbarui"
          : "Imam rotasi ditambahkan"
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function delRolling(id: string) {
    if (!confirm("Hapus imam dari daftar rotasi?")) return;
    try {
      await fetch(`/api/imam-rolling/${id}`, { method: "DELETE" });
      await load();
      toast.success("Imam rotasi dihapus");
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

  // --- DAILY OVERRIDE LOGIC ---
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
      toast.success(editingId ? "Jadwal harian diperbarui" : "Jadwal harian ditambahkan");
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
    if (!confirm("Hapus jadwal tanggal ini?")) return;
    try {
      await fetch(`/api/imam-schedules/${id}`, { method: "DELETE" });
      if (editingId === id) resetScheduleForm();
      await load();
      toast.success("Jadwal dihapus");
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Imam &amp; Muadzin"
        description="Atur jadwal imam pekanan rutin (dengan opsi Tetap Selamanya), rotasi Subuh Jumat, serta jadwal pengganti harian."
        action={
          <ScheduleExportActions
            type="imam"
            mosqueName="Masjid Pondok Tahfizh Plus Abu Dzar"
            schedules={schedules.map((s) => ({
              id: s.id,
              scheduleDate: s.scheduleDate,
              prayerName: s.prayerName,
              imamName: s.imamName,
              muadzinName: s.muadzinName,
              notes: s.notes,
            }))}
            rollingImamName={rolling.find((r) => r.isActive)?.imamName}
            variant="admin"
          />
        }
      />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[#ded5c4] bg-[#fbf9f4] p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("weekly")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
            activeTab === "weekly"
              ? "bg-[#2d946e] text-white shadow-md ring-2 ring-[#2d946e]/20"
              : "text-[#3f5045] hover:bg-[#ede5d5] hover:text-[#19261f]"
          }`}
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Jadwal Pekanan (Rutin)</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
            Tetap Selamanya
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rolling")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
            activeTab === "rolling"
              ? "bg-[#2d946e] text-white shadow-md ring-2 ring-[#2d946e]/20"
              : "text-[#3f5045] hover:bg-[#ede5d5] hover:text-[#19261f]"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Rotasi Subuh Jumat</span>
          <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            {rolling.length} Imam
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("daily")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
            activeTab === "daily"
              ? "bg-[#2d946e] text-white shadow-md ring-2 ring-[#2d946e]/20"
              : "text-[#3f5045] hover:bg-[#ede5d5] hover:text-[#19261f]"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Jadwal Harian / Override</span>
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : activeTab === "weekly" ? (
        /* --- TAB 1: JADWAL PEKANAN (RUTIN) --- */
        <div className="space-y-6">
          <Card className="min-w-0 border-[#ded5c4] bg-[#fdfbf7]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e8dfcf] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <SectionHeading
                    icon={CalendarCheck}
                    title="Jadwal Imam & Muadzin Pekanan"
                    description="Atur penugasan rutin per hari (Senin - Ahad). Aktifkan 'Tetap Selamanya' agar berlaku seterusnya secara otomatis di Layar TV & Web."
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={copyCurrentDayToAllDays}
                  className="text-xs border-[#ded5c4] hover:bg-[#f1eae0]"
                  title="Salin penugasan hari ini ke seluruh hari lainnya"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin ke Semua Hari</span>
                </Button>
                <Button
                  onClick={saveWeeklySchedule}
                  disabled={saving}
                  className="bg-[#2d946e] hover:bg-[#237858] text-white shadow-sm"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Simpan Semua Pekan
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Day Selector Pills */}
            <div className="my-5 flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDay === d.value;
                const assignedCount = PRAYERS.filter((p) => {
                  const item = getWeeklyPrayer(d.value, p);
                  return Boolean(item.imamName?.trim());
                }).length;

                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setSelectedDay(d.value)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                      isSelected
                        ? "bg-[#19261f] text-white shadow-md ring-2 ring-[#19261f]/20"
                        : "border border-[#ded5c4] bg-white text-[#3f5045] hover:border-[#2d946e] hover:bg-[#eaf6f0]"
                    }`}
                  >
                    <span>{d.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected
                          ? "bg-[#2d946e] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {assignedCount}/5
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Prayers Form for Selected Day */}
            <div className="rounded-2xl border border-[#ded5c4] bg-white p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#e8dfcf] pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#2d946e]"></span>
                  <h3 className="font-black text-base text-[#19261f]">
                    Jadwal Shalat Hari{" "}
                    <span className="text-[#2d946e]">
                      {DAYS_OF_WEEK.find((d) => d.value === selectedDay)?.name}
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#5c6e63]">
                  <Sparkles className="h-3.5 w-3.5 text-[#8a6820]" />
                  <span>Otomatis berulang setiap {DAYS_OF_WEEK.find((d) => d.value === selectedDay)?.name}</span>
                </div>
              </div>

              <div className="space-y-4">
                {PRAYERS.map((prayerName) => {
                  const item = getWeeklyPrayer(selectedDay, prayerName);

                  return (
                    <div
                      key={prayerName}
                      className="rounded-xl border border-[#e8dfcf] bg-[#fcfaf6] p-4 transition-colors hover:border-[#2d946e]/40"
                    >
                      <div className="grid gap-3 sm:grid-cols-[110px_1fr_1fr_auto] sm:items-center">
                        {/* Prayer Name Badge */}
                        <div className="flex items-center sm:block">
                          <span className="inline-block rounded-lg bg-[#2d946e]/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#1e6149] border border-[#2d946e]/20">
                            {prayerName}
                          </span>
                        </div>

                        {/* Imam Name */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[11px] text-[#5c6e63]">
                              Nama Imam
                            </Label>
                            {selectedDay === 5 && prayerName === "Subuh" && (
                              <span className="text-[10px] font-bold text-[#8a6820] bg-[#eddcb2]/40 px-2 py-0.5 rounded-full border border-[#c5a059]/30">
                                ⭐ Rotasi Otomatis (Tab 2)
                              </span>
                            )}
                          </div>
                          <PetugasSelect
                            value={item.imamName}
                            onChange={(val) =>
                              updateWeeklyField(
                                selectedDay,
                                prayerName,
                                "imamName",
                                val
                              )
                            }
                            roleFilter="IMAM"
                            placeholder={
                              selectedDay === 5 && prayerName === "Subuh"
                                ? "Otomatis bergilir (Rotasi Subuh)"
                                : "Pilih Nama Imam"
                            }
                            className="bg-white"
                            petugasList={petugas}
                          />
                          {selectedDay === 5 && prayerName === "Subuh" && (
                            <p className="mt-1 text-[11px] text-[#5c6e63]">
                              💡 Jadwal shalat Subuh hari Jumat <b>otomatis mengikuti urutan siklus asatidzah</b> di Tab <i>&quot;Rotasi Subuh Jumat&quot;</i> ({rolling.length} imam terdaftar). Anda cukup menentukan petugas Muadzin di sini.
                            </p>
                          )}
                        </div>

                        {/* Muadzin Name */}
                        <div>
                          <Label className="text-[11px] text-[#5c6e63] mb-1">
                            Nama Muadzin
                          </Label>
                          <PetugasSelect
                            value={item.muadzinName}
                            onChange={(val) =>
                              updateWeeklyField(
                                selectedDay,
                                prayerName,
                                "muadzinName",
                                val
                              )
                            }
                            roleFilter="MUADZIN"
                            placeholder="Pilih Nama Muadzin"
                            className="bg-white"
                            petugasList={petugas}
                          />
                        </div>

                        {/* Tetap Selamanya Checkbox */}
                        <div className="flex flex-col justify-end pt-1 sm:pt-4">
                          <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-white px-3 py-2 border border-[#ded5c4] shadow-xs hover:border-[#2d946e]">
                            <input
                              type="checkbox"
                              checked={item.isPermanent}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                updateWeeklyField(
                                  selectedDay,
                                  prayerName,
                                  "isPermanent",
                                  checked
                                );
                                if (checked) {
                                  updateWeeklyField(
                                    selectedDay,
                                    prayerName,
                                    "effectiveUntil",
                                    null
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-[#ded5c4] text-[#2d946e] focus:ring-[#2d946e]"
                            />
                            <span className="text-xs font-bold text-[#19261f] whitespace-nowrap">
                              Tetap Selamanya
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Expiration date if not permanent */}
                      {!item.isPermanent && (
                        <div className="mt-3 pt-3 border-t border-[#ded5c4]/60 grid gap-2 sm:grid-cols-2">
                          <div>
                            <Label className="text-[11px] text-[#5c6e63]">
                              Berlaku Sampai Tanggal
                            </Label>
                            <Input
                              type="date"
                              value={item.effectiveUntil ?? ""}
                              onChange={(e) =>
                                updateWeeklyField(
                                  selectedDay,
                                  prayerName,
                                  "effectiveUntil",
                                  e.target.value || null
                                )
                              }
                              className="text-xs bg-white"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-[#5c6e63]">
                              Catatan (Opsional)
                            </Label>
                            <Input
                              value={item.notes ?? ""}
                              onChange={(e) =>
                                updateWeeklyField(
                                  selectedDay,
                                  prayerName,
                                  "notes",
                                  e.target.value
                                )
                              }
                              placeholder="Misal: Selama bulan Ramadhan"
                              className="text-xs bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom save bar */}
              <div className="pt-3 flex justify-end">
                <Button
                  onClick={saveWeeklySchedule}
                  disabled={saving}
                  className="bg-[#2d946e] hover:bg-[#237858] text-white px-6 py-2.5 font-bold shadow-sm"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Simpan Jadwal Pekanan
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : activeTab === "rolling" ? (
        /* --- TAB 2: ROTASI SUBUH JUMAT --- */
        <Card className="min-w-0 border-[#ded5c4] bg-[#fdfbf7]">
          <SectionHeading
            icon={UserCheck}
            title="Rotasi Imam Subuh Jumat"
            description="Urutan rotasi mingguan imam Subuh Jumat. Bergulir otomatis setiap hari Jumat Subuh."
          />

          <div className="mb-6 rounded-2xl border border-[#ded5c4] bg-white p-4 shadow-sm">
            <h4 className="text-xs font-bold text-[#19261f] uppercase tracking-wider mb-3">
              {editingRollingId ? "Edit Imam Rotasi Subuh Jumat" : "Tambah Imam Rotasi Subuh Jumat"}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_auto_auto_auto] items-end">
              <div>
                <Label htmlFor="rollName">Nama Imam</Label>
                <PetugasSelect
                  id="rollName"
                  value={rollName}
                  onChange={setRollName}
                  roleFilter="IMAM"
                  placeholder="Pilih Imam Subuh..."
                  className="bg-[#fcfaf6]"
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
                  className="bg-[#fcfaf6]"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer rounded-lg bg-[#fcfaf6] px-3 py-2 border border-[#ded5c4] hover:border-[#2d946e]">
                  <input
                    type="checkbox"
                    checked={rollPermanent}
                    onChange={(e) => setRollPermanent(e.target.checked)}
                    className="h-4 w-4 rounded border-[#ded5c4] text-[#2d946e] focus:ring-[#2d946e]"
                  />
                  <span className="text-xs font-bold text-[#19261f] whitespace-nowrap">
                    Tetap Selamanya
                  </span>
                </label>
              </div>

              <div className="flex gap-1.5">
                <Button
                  onClick={submitRolling}
                  disabled={saving}
                  className="bg-[#2d946e] hover:bg-[#237858] text-white"
                >
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

            {!rollPermanent && (
              <div className="mt-3 pt-3 border-t border-[#ded5c4]/60 max-w-xs">
                <Label htmlFor="rollUntil">Berlaku Hingga</Label>
                <Input
                  id="rollUntil"
                  type="date"
                  value={rollUntil}
                  onChange={(e) => setRollUntil(e.target.value)}
                  className="bg-[#fcfaf6]"
                />
              </div>
            )}
          </div>

          {rolling.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#ded5c4] bg-white px-4 py-8 text-center text-xs text-[#5c6e63]">
              Belum ada data rotasi imam Subuh Jumat.
            </p>
          ) : (
            <ul className="space-y-2">
              {rolling.map((r, index) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#ded5c4] bg-white px-4 py-3 transition-colors hover:border-[#2d946e]/50 hover:bg-[#faf7f2]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2d946e]/10 text-xs font-black text-[#1e6149] ring-1 ring-[#2d946e]/30">
                      {r.sequenceNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-[#19261f]">
                          {r.imamName}
                        </p>
                        {!r.isActive && <Badge color="slate">Nonaktif</Badge>}
                        {r.effectiveUntil ? (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                            s/d {toYmd(r.effectiveUntil)}
                          </span>
                        ) : (
                          <span className="rounded-md bg-[#2d946e]/10 px-2 py-0.5 text-[10px] font-bold text-[#1e6149] border border-[#2d946e]/25">
                            Tetap Selamanya
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5c6e63]">
                        Mulai berlaku sejak {toYmd(r.effectiveFrom)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                      onClick={() => beginEditRolling(r)}
                      title="Edit Imam Rotasi"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
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
      ) : (
        /* --- TAB 3: JADWAL HARIAN / OVERRIDE --- */
        <Card className="min-w-0 border-[#ded5c4] bg-[#fdfbf7]">
          <SectionHeading
            icon={Users}
            title="Jadwal Pengganti / Khusus Tanggal Tertentu"
            description="Gunakan fitur ini jika ada imam tamu atau pergantian khusus pada tanggal tertentu (override jadwal pekanan)."
          />

          <div className="mb-6 rounded-2xl border border-[#ded5c4] bg-white p-4 shadow-sm">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="schedDate">Tanggal Spesifik</Label>
                <Input
                  id="schedDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-[#fcfaf6]"
                />
              </div>
              <div>
                <Label htmlFor="prayer">Waktu Shalat</Label>
                <Select
                  id="prayer"
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  className="bg-[#fcfaf6]"
                >
                  {PRAYERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="imam">Nama Imam</Label>
                <PetugasSelect
                  id="imam"
                  value={imam}
                  onChange={setImam}
                  roleFilter="IMAM"
                  placeholder="Pilih Nama Imam"
                  className="bg-[#fcfaf6]"
                  petugasList={petugas}
                />
              </div>
              <div>
                <Label htmlFor="muadzin">Nama Muadzin</Label>
                <PetugasSelect
                  id="muadzin"
                  value={muadzin}
                  onChange={setMuadzin}
                  roleFilter="MUADZIN"
                  placeholder="Pilih Nama Muadzin"
                  className="bg-[#fcfaf6]"
                  petugasList={petugas}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Menggantikan imam utama yang bertugas luar kota"
                  className="bg-[#fcfaf6]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={submitSchedule}
                disabled={saving}
                className="bg-[#2d946e] hover:bg-[#237858] text-white"
              >
                {editingId ? (
                  <>
                    <Pencil className="h-4 w-4" /> Simpan Perubahan
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Tambah Jadwal Override
                  </>
                )}
              </Button>
              {editingId && (
                <Button variant="secondary" onClick={resetScheduleForm}>
                  Batal
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#ded5c4] bg-white">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-[#fbf9f4] text-[10px] uppercase tracking-wider text-[#5c6e63] border-b border-[#ded5c4]">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Shalat</th>
                  <th className="px-4 py-3">Imam</th>
                  <th className="px-4 py-3">Muadzin</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfcf]">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#5c6e63]">
                      Belum ada jadwal override tanggal. Sistem menggunakan Jadwal Pekanan rutin secara otomatis.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-[#faf7f2]"
                    >
                      <td className="px-4 py-3 font-medium text-[#19261f]">
                        {toYmd(s.scheduleDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200">
                          {s.prayerName}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#19261f]">
                        {s.imamName}
                      </td>
                      <td className="px-4 py-3 text-[#5c6e63]">
                        {s.muadzinName}
                      </td>
                      <td className="px-4 py-3">
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
      )}
    </div>
  );
}
