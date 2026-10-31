"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Button,
  Card,
  Input,
  Label,
  LoadingState,
  PageHeader,
  SectionHeading,
} from "@/components/ui";
import {
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { PetugasItem, PetugasRole, ROLE_LABELS } from "@/types/petugas";

const ALL_ROLES: PetugasRole[] = ["IMAM", "MUADZIN", "KHATIB", "PEMATERI", "LAINNYA"];

export default function AdminPetugasPage() {
  const [petugas, setPetugas] = useState<PetugasItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<PetugasRole[]>(["IMAM"]);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter State
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  async function load() {
    try {
      const res = await fetch("/api/petugas", { cache: "no-store" });
      if (res.ok) {
        setPetugas(await res.json());
      }
    } catch {
      toast.error("Gagal memuat daftar petugas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleRole(role: PetugasRole) {
    setRoles((prev) =>
      prev.includes(role)
        ? prev.length > 1
          ? prev.filter((r) => r !== role)
          : prev
        : [...prev, role]
    );
  }

  function resetForm() {
    setName("");
    setRoles(["IMAM"]);
    setPhone("");
    setNotes("");
    setEditingId(null);
  }

  function startEdit(item: PetugasItem) {
    setName(item.name);
    setRoles(item.roles);
    setPhone(item.phone ?? "");
    setNotes(item.notes ?? "");
    setEditingId(item.id);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nama petugas wajib diisi");
    if (roles.length === 0) return toast.error("Pilih minimal satu role");

    setSaving(true);
    try {
      let updated: PetugasItem[];
      if (editingId) {
        updated = petugas.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: name.trim(),
                roles,
                phone: phone.trim() || null,
                notes: notes.trim() || null,
              }
            : p
        );
      } else {
        const newItem: PetugasItem = {
          id: `p-${Date.now()}`,
          name: name.trim(),
          roles,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          isActive: true,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        updated = [newItem, ...petugas];
      }

      const res = await fetch("/api/petugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updated }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan ke server");

      setPetugas(updated);
      toast.success(editingId ? "Data petugas diperbarui" : "Petugas baru berhasil ditambahkan");
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, itemName: string) {
    if (!confirm(`Hapus ${itemName} dari daftar petugas?`)) return;
    const updated = petugas.filter((p) => p.id !== id);
    setPetugas(updated);
    try {
      const res = await fetch("/api/petugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updated }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus");
      }
      toast.success("Petugas berhasil dihapus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
      await load();
    }
  }

  async function toggleStatus(id: string) {
    const updated = petugas.map((p) =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    );
    setPetugas(updated);
    try {
      const res = await fetch("/api/petugas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updated }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal memperbarui status");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui status");
      await load();
    }
  }

  // Filtered List
  const filtered = useMemo(() => {
    return petugas.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.phone && p.phone.includes(search));
      const matchRole =
        roleFilter === "ALL" || p.roles.includes(roleFilter as PetugasRole);
      return matchSearch && matchRole;
    });
  }, [petugas, search, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: petugas.length,
      imam: petugas.filter((p) => p.roles.includes("IMAM")).length,
      muadzin: petugas.filter((p) => p.roles.includes("MUADZIN")).length,
      khatib: petugas.filter((p) => p.roles.includes("KHATIB")).length,
      pemateri: petugas.filter((p) => p.roles.includes("PEMATERI")).length,
    };
  }, [petugas]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Data Petugas & Asatidz"
        description="Kelola daftar nama imam, muadzin, khatib, dan pemateri kajian. Data ini langsung muncul sebagai pilihan saat mengatur jadwal."
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-[#ded5c4] bg-[#fdfbf7] p-4 text-center shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5c6e63]">Total Petugas</p>
          <p className="mt-1 text-2xl font-black text-[#19261f]">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-[#bde5d2] bg-[#f0f9f4] p-4 text-center shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1e6149]">Imam Shalat</p>
          <p className="mt-1 text-2xl font-black text-[#2d946e]">{stats.imam}</p>
        </div>
        <div className="rounded-2xl border border-[#cbe8d9] bg-[#eef7f2] p-4 text-center shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#2b594b]">Muadzin</p>
          <p className="mt-1 text-2xl font-black text-[#457c6b]">{stats.muadzin}</p>
        </div>
        <div className="rounded-2xl border border-[#ecd8a6] bg-[#faf4e6] p-4 text-center shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7c6630]">Khatib Jumat</p>
          <p className="mt-1 text-2xl font-black text-[#8a6820]">{stats.khatib}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-[#c5d0f5] bg-[#f2f5fd] p-4 text-center shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#2740b0]">Pemateri Kajian</p>
          <p className="mt-1 text-2xl font-black text-[#4361ee]">{stats.pemateri}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Form Card (Left) */}
        <div className="lg:col-span-5">
          <Card className="min-w-0 border-[#ded5c4] bg-[#fdfbf7]">
            <SectionHeading
              icon={editingId ? Pencil : Plus}
              title={editingId ? "Edit Data Petugas" : "Tambah Petugas Baru"}
              description="Masukkan nama dan pilih peran/role yang diemban di masjid."
            />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="petugasName">Nama Lengkap & Gelar</Label>
                <Input
                  id="petugasName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ust. Abdullah Mundzir"
                  className="bg-white"
                  required
                />
              </div>

              <div>
                <Label>Pilihan Peran / Role (Bisa Lebih dari Satu)</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {ALL_ROLES.map((role) => {
                    const isSelected = roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-[#2d946e] text-white border-[#2d946e] shadow-xs"
                            : "bg-white text-[#3f5045] border-[#ded5c4] hover:bg-[#faf7f2]"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        <span>{ROLE_LABELS[role].label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Nomor Telepon / WhatsApp (Opsional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Asatidz Pondok Tahfizh / Santri Angkatan 2"
                  className="bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#2d946e] hover:bg-[#237858] text-white flex-1"
                >
                  {editingId ? (
                    <>
                      <Pencil className="h-4 w-4 mr-1" /> Simpan Perubahan
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" /> Simpan Petugas
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button variant="secondary" onClick={resetForm}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* List Card (Right) */}
        <div className="lg:col-span-7">
          <Card className="min-w-0 border-[#ded5c4] bg-[#fdfbf7]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#ded5c4] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#19261f]">Daftar Asatidz & Petugas</h3>
                <p className="text-xs text-[#5c6e63]">Total {filtered.length} orang ditampilkan</p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7c9487]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama / no. hp..."
                  className="w-full rounded-xl border border-[#ded5c4] bg-white pl-8 pr-3 py-1.5 text-xs text-[#19261f] focus:border-[#2d946e] focus:outline-none"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="my-3 flex flex-wrap gap-1.5">
              {[
                { id: "ALL", label: "Semua" },
                { id: "IMAM", label: "Imam" },
                { id: "MUADZIN", label: "Muadzin" },
                { id: "KHATIB", label: "Khatib" },
                { id: "PEMATERI", label: "Pemateri" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRoleFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                    roleFilter === f.id
                      ? "bg-[#19261f] text-white"
                      : "bg-white text-[#5c6e63] border border-[#ded5c4] hover:bg-[#faf7f2]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Table */}
            {loading ? (
              <LoadingState />
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#ded5c4] bg-white p-8 text-center text-xs text-[#5c6e63]">
                Tidak ada petugas yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#ded5c4] bg-white">
                <div className="max-h-[500px] overflow-y-auto divide-y divide-[#ded5c4]/60">
                  {filtered.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 sm:px-4 sm:py-3.5 transition-colors hover:bg-[#faf7f2]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-[#19261f]">
                            {item.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleStatus(item.id)}
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${
                              item.isActive
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                            title="Klik untuk ubah status aktif/nonaktif"
                          >
                            {item.isActive ? "Aktif" : "Nonaktif"}
                          </button>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {item.roles.map((r) => (
                            <span
                              key={r}
                              className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${ROLE_LABELS[r]?.badgeColor}`}
                            >
                              {r}
                            </span>
                          ))}
                          {item.phone && (
                            <span className="text-[10px] text-[#5c6e63] ml-1">
                              • {item.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-[#eaf6f0] hover:text-[#2d946e] transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
