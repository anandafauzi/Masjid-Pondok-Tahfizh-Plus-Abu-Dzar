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
  Textarea,
} from "@/components/ui";
import {
  MessageSquareQuote,
  Plus,
  Power,
  Trash2,
} from "lucide-react";

interface Advice {
  id: string;
  content: string;
  sourceReference: string | null;
  authorOrSource: string | null;
  verificationStatus: string;
  displayOrder: number;
  isActive: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  UNVERIFIED: "Belum diverifikasi",
  VERIFIED: "Terverifikasi",
  NEEDS_REVIEW: "Perlu tinjauan",
};

export default function AdminNasihatPage() {
  const [items, setItems] = useState<Advice[]>([]);
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("UNVERIFIED");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/advice", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch {
      toast.error("Gagal memuat nasihat");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!content.trim()) return toast.error("Isi nasihat wajib diisi");
    setSaving(true);
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          sourceReference: source || null,
          authorOrSource: author || null,
          verificationStatus: status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah");
      toast.success("Nasihat ditambahkan");
      setContent("");
      setSource("");
      setAuthor("");
      setStatus("UNVERIFIED");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: Advice) {
    try {
      await fetch(`/api/advice/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      await load();
    } catch {
      toast.error("Gagal mengubah status");
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus nasihat ini?")) return;
    try {
      const res = await fetch(`/api/advice/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Nasihat dihapus");
      await load();
    } catch {
      toast.error("Gagal menghapus");
    }
  }

  return (
    <div>
      <PageHeader
        icon={MessageSquareQuote}
        title="Nasihat Islami"
        description="Konten nasihat dan hadits yang tampil bergantian di TV Display."
      />

      <Card className="mb-6 max-w-4xl">
        <SectionHeading
          icon={Plus}
          title="Tambah Nasihat"
          description="Sertakan sumber yang jelas agar konten dapat diverifikasi."
        />
        <div className="space-y-3">
          <div>
            <Label htmlFor="content">Isi Nasihat</Label>
            <Textarea
              id="content"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis nasihat..."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="source">Sumber Referensi</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="QS. ..., HR. ..."
              />
            </div>
            <div>
              <Label htmlFor="author">Penulis / Sumber</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Status Verifikasi</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={add} disabled={saving}>
            <Plus className="h-4 w-4" /> Tambah Nasihat
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-xs text-slate-500">
              Belum ada nasihat. Tambahkan konten pertama melalui formulir di atas.
            </p>
          </Card>
        ) : (
          items.map((item) => (
            <Card
              key={item.id}
              className="relative overflow-hidden border-l-4 border-l-amber-400"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge color={item.isActive ? "green" : "slate"}>
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <Badge
                      color={
                        item.verificationStatus === "VERIFIED"
                          ? "green"
                          : item.verificationStatus === "NEEDS_REVIEW"
                            ? "amber"
                            : "slate"
                      }
                    >
                      {STATUS_LABEL[item.verificationStatus] ??
                        item.verificationStatus}
                    </Badge>
                    <span className="text-[11px] text-slate-400">
                      Urutan {item.displayOrder}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800">
                    “{item.content}”
                  </p>
                  {(item.sourceReference || item.authorOrSource) && (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      {item.authorOrSource}
                      {item.sourceReference ? ` — ${item.sourceReference}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <Button variant="secondary" onClick={() => toggle(item)}>
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
    </div>
  );
}
