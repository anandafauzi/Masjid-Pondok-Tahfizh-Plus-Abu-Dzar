"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  KeyRound,
  Power,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  isActive: boolean;
  createdAt: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("ADMIN");

  const isSuper = session?.user?.role === "SUPER_ADMIN";

  async function load() {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch {
      toast.error("Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && isSuper) load();
    if (status === "authenticated" && !isSuper) setLoading(false);
  }, [status, isSuper]);

  async function add() {
    if (!name || !email || !password)
      return toast.error("Nama, email, dan password wajib diisi");
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah");
      toast.success("Pengguna ditambahkan");
      setName("");
      setEmail("");
      setPassword("");
      setRole("ADMIN");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah");
    } finally {
      setSaving(false);
    }
  }

  async function update(user: User, patch: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal");
      toast.success("Pengguna diperbarui");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  async function resetPassword(user: User) {
    const pwd = window.prompt(
      `Password baru untuk ${user.email} (minimal 6 karakter):`
    );
    if (!pwd) return;
    if (pwd.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    await update(user, { password: pwd });
  }

  async function remove(user: User) {
    if (!confirm(`Hapus pengguna ${user.email}?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      toast.success("Pengguna dihapus");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  if (status === "loading") {
    return (
      <Card>
        <LoadingState label="Memeriksa sesi..." />
      </Card>
    );
  }

  if (!isSuper) {
    return (
      <Card>
        <div className="py-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-800">Akses Terbatas</p>
          <p className="mt-1 text-xs text-slate-500">
            Halaman ini hanya dapat diakses oleh Super Admin.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Manajemen Pengguna"
        description="Kelola akun admin dan super admin yang dapat mengakses panel ini."
      />

      <Card className="mb-6 max-w-4xl">
        <SectionHeading
          icon={UserPlus}
          title="Tambah Pengguna"
          description="Berikan akses admin kepada petugas takmir yang berwenang."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="role">Peran</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as User["role"])}
            >
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={add} disabled={saving}>
            <UserPlus className="h-4 w-4" /> Tambah Pengguna
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeading
          icon={Users}
          title="Daftar Pengguna"
          description={`${items.length} akun terdaftar.`}
        />
        {loading ? (
          <LoadingState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="bg-slate-900 text-[11px] font-semibold uppercase tracking-wider text-white">
                  <th className="rounded-l-xl px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="rounded-r-xl px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-bold text-white shadow-sm">
                          {initials(u.name) || "?"}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={u.role === "SUPER_ADMIN" ? "amber" : "slate"}
                      >
                        {u.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.isActive ? "green" : "red"}>
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-emerald-100 hover:text-emerald-700"
                          onClick={() => update(u, { isActive: !u.isActive })}
                          title={u.isActive ? "Nonaktifkan" : "Aktifkan"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-100 hover:text-amber-700"
                          onClick={() =>
                            update(u, {
                              role:
                                u.role === "SUPER_ADMIN"
                                  ? "ADMIN"
                                  : "SUPER_ADMIN",
                            })
                          }
                          title={
                            u.role === "SUPER_ADMIN"
                              ? "Jadikan Admin"
                              : "Jadikan Super Admin"
                          }
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-sky-100 hover:text-sky-700"
                          onClick={() => resetPassword(u)}
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600"
                          onClick={() => remove(u)}
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
