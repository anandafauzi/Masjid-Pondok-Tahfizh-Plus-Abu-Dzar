"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
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
  HandCoins,
  Landmark,
  Plus,
  QrCode,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  DonationAccountInput,
  DonationAdminInfo,
} from "@/lib/donation";

const ALLOWED_QR_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_QR_BYTES = 5 * 1024 * 1024;

interface DonationForm extends Omit<DonationAdminInfo, "accounts"> {
  accounts: Array<DonationAccountInput & { key: string }>;
}

const emptyAccount = (): DonationAccountInput & { key: string } => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  bankName: "",
  accountNumber: "",
  accountName: "",
});

export default function AdminDonasiPage() {
  const [form, setForm] = useState<DonationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/donation-info", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Gagal memuat info donasi");
        setForm({
          ...data,
          accounts: (data.accounts ?? []).map(
            (account: DonationAccountInput) => ({
              ...account,
              key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            })
          ),
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal memuat info donasi"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function update<K extends keyof Omit<DonationForm, "accounts">>(
    key: K,
    value: DonationForm[K]
  ) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateAccount(
    key: string,
    field: keyof DonationAccountInput,
    value: string
  ) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            accounts: prev.accounts.map((account) =>
              account.key === key ? { ...account, [field]: value } : account
            ),
          }
        : prev
    );
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_QR_MIME.has(file.type)) {
      toast.error("Format QR harus PNG, JPEG, WebP, atau GIF");
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      toast.error("Ukuran QR maksimal 5 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const src = loadEvent.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // QR padat butuh resolusi lebih tinggi dari logo masjid.
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.error("Browser tidak mendukung pemrosesan gambar");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        update("qrImageUrl", canvas.toDataURL("image/png"));
        toast.success("QR berhasil dimuat dari perangkat");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/donation-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          notes: form.notes,
          qrImageUrl: form.qrImageUrl,
          isActive: form.isActive,
          accounts: form.accounts.map(({ bankName, accountNumber, accountName }) => ({
            bankName,
            accountNumber,
            accountName,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success("Info donasi disimpan");
      setForm((prev) =>
        prev
          ? {
              ...prev,
              accounts: data.accounts.map((account: DonationAccountInput) => ({
                ...account,
                key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              })),
            }
          : prev
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon={HandCoins}
        title="Info Donasi"
        description="Atur rekening transfer dan QR donasi. Tampil di web publik dan aplikasi Android, tidak di layar TV."
      />

      {loading || !form ? (
        <Card className="max-w-4xl">
          <LoadingState />
        </Card>
      ) : (
        <Card className="max-w-4xl">
          <div className="space-y-8">
            <section className="space-y-4">
              <SectionHeading
                icon={HandCoins}
                title="Pengaturan Umum"
                description="Judul dan catatan ini tampil di halaman donasi web serta kartu Info aplikasi Android."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="donation-title">Judul</Label>
                  <Input
                    id="donation-title"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="Donasi Masjid"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="donation-notes">Catatan / Instruksi</Label>
                  <Textarea
                    id="donation-notes"
                    rows={3}
                    value={form.notes ?? ""}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Contoh: Transfer atau scan QRIS. Konfirmasi donasi ke panitia."
                  />
                </div>
                <div className="sm:col-span-2">
                  <Toggle
                    checked={form.isActive}
                    onChange={(value) => update("isActive", value)}
                    label="Tampilkan info donasi"
                    description="Nonaktifkan untuk menyembunyikan seluruh info donasi dari web dan Android."
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-6">
              <SectionHeading
                icon={Landmark}
                title="Rekening Transfer"
                description="Bisa lebih dari satu rekening. Kosongkan baris yang tidak dipakai sebelum menyimpan."
              />
              <div className="space-y-3">
                {form.accounts.map((account, index) => (
                  <div
                    key={account.key}
                    className="rounded-2xl border border-[#ded5c4] bg-[#fdfbf7] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#5c6e63]">
                        Rekening {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setForm((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  accounts: prev.accounts.filter(
                                    (row) => row.key !== account.key
                                  ),
                                }
                              : prev
                          )
                        }
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label htmlFor={`bank-${account.key}`}>Nama Bank</Label>
                        <Input
                          id={`bank-${account.key}`}
                          value={account.bankName}
                          onChange={(e) =>
                            updateAccount(account.key, "bankName", e.target.value)
                          }
                          placeholder="BSI"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`number-${account.key}`}>
                          Nomor Rekening
                        </Label>
                        <Input
                          id={`number-${account.key}`}
                          value={account.accountNumber}
                          onChange={(e) =>
                            updateAccount(
                              account.key,
                              "accountNumber",
                              e.target.value
                            )
                          }
                          placeholder="1234567890"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`holder-${account.key}`}>
                          Atas Nama
                        </Label>
                        <Input
                          id={`holder-${account.key}`}
                          value={account.accountName}
                          onChange={(e) =>
                            updateAccount(
                              account.key,
                              "accountName",
                              e.target.value
                            )
                          }
                          placeholder="Masjid Abu Dzar"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setForm((prev) =>
                      prev
                        ? { ...prev, accounts: [...prev.accounts, emptyAccount()] }
                        : prev
                    )
                  }
                >
                  <Plus className="h-4 w-4" />
                  Tambah Rekening
                </Button>
              </div>
            </section>

            <section className="space-y-4 border-t border-slate-100 pt-6">
              <SectionHeading
                icon={QrCode}
                title="QR Donasi"
                description="Gambar QR yang sudah Anda siapkan. QR tampil di web dan Android."
              />
              <div className="rounded-2xl border border-[#ded5c4] bg-[#fdfbf7] p-4 sm:p-5">
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                  <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#2d946e]/40 bg-white shadow-sm ring-4 ring-[#2d946e]/10">
                    {form.qrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.qrImageUrl}
                        alt="Pratinjau QR donasi"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-center text-[#8e9f94]">
                        <QrCode className="mx-auto h-10 w-10" />
                        <span className="mt-2 block text-[10px] font-semibold">
                          Belum Ada QR
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#2d946e] hover:bg-[#237858] text-white text-xs py-2 px-3.5"
                      >
                        <Upload className="h-4 w-4" />
                        Pilih QR dari Perangkat
                      </Button>
                      {form.qrImageUrl && (
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => update("qrImageUrl", null)}
                          className="text-xs py-2 px-3"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus QR
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#78887e]">
                      Format: PNG, JPEG, WebP, GIF (maks. 5 MB). QR disimpan
                      sebagai gambar agar bisa dibaca aplikasi Android saat
                      offline.
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#ded5c4]/60 pt-4">
                  <Label
                    htmlFor="qr-url"
                    className="text-[11px] text-[#78887e]"
                  >
                    Atau masukkan tautan HTTPS QR (opsional)
                  </Label>
                  <Input
                    id="qr-url"
                    value={
                      form.qrImageUrl?.startsWith("data:")
                        ? "(Gambar dari perangkat terpasang)"
                        : form.qrImageUrl ?? ""
                    }
                    disabled={form.qrImageUrl?.startsWith("data:")}
                    onChange={(e) => update("qrImageUrl", e.target.value)}
                    placeholder="https://.../qris.png"
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <p className="text-xs text-slate-500">
                Perubahan langsung tampil di web dan sinkron saat aplikasi
                Android melakukan refresh.
              </p>
              <Button onClick={save} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Menyimpan..." : "Simpan Info Donasi"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
