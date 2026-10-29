"use client";

import { useEffect, useState, useId } from "react";
import { PetugasItem, PetugasRole } from "@/types/petugas";
import { PenTool, ListFilter } from "lucide-react";

interface PetugasSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  roleFilter?: PetugasRole | "ALL";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  petugasList?: PetugasItem[];
}

export function PetugasSelect({
  id,
  value,
  onChange,
  roleFilter = "ALL",
  placeholder = "Pilih petugas...",
  className = "",
  disabled = false,
  petugasList: propList,
}: PetugasSelectProps) {
  const autoId = useId();
  const selectId = id || autoId;
  const [internalList, setInternalList] = useState<PetugasItem[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);

  useEffect(() => {
    if (propList && propList.length > 0) {
      setInternalList(propList);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await fetch("/api/petugas", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setInternalList(data);
          }
        }
      } catch (err) {
        console.warn("Gagal memuat petugas dropdown:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [propList]);

  const list = propList && propList.length > 0 ? propList : internalList;

  // Filter based on role
  const filtered = list.filter((p) => {
    if (!p.isActive) return false;
    if (roleFilter === "ALL") return true;
    return p.roles.includes(roleFilter);
  });

  // Check if current value exists in filtered list
  const valueInList = filtered.some((p) => p.name === value);

  if (isManualMode) {
    return (
      <div className="relative flex items-center gap-1.5">
        <input
          id={selectId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik nama manual..."
          disabled={disabled}
          className={`flex-1 rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-xs text-[#19261f] shadow-2xs transition-colors placeholder:text-slate-400 focus:border-[#2d946e] focus:outline-hidden focus:ring-2 focus:ring-[#2d946e]/20 sm:text-sm ${className}`}
        />
        <button
          type="button"
          onClick={() => setIsManualMode(false)}
          title="Kembali ke pilihan dropdown petugas"
          className="rounded-lg border border-[#ded5c4] bg-[#faf7f2] p-2 text-xs font-semibold text-[#5c6e63] hover:bg-[#eaf6f0] hover:text-[#2d946e] transition-colors"
        >
          <ListFilter className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1.5">
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === "__MANUAL__") {
            setIsManualMode(true);
          } else {
            onChange(e.target.value);
          }
        }}
        className={`flex-1 rounded-xl border border-[#ded5c4] bg-white px-3 py-2 text-xs text-[#19261f] shadow-2xs transition-colors focus:border-[#2d946e] focus:outline-hidden focus:ring-2 focus:ring-[#2d946e]/20 sm:text-sm ${className}`}
      >
        <option value="">{`— ${placeholder} —`}</option>

        {/* Existing value if not in list */}
        {value && !valueInList && (
          <option value={value}>
            {value} (Kustom / Manual)
          </option>
        )}

        {/* Filtered Petugas Options */}
        {filtered.map((p) => (
          <option key={p.id} value={p.name}>
            {p.name}
          </option>
        ))}

        <option disabled>──────────────</option>
        <option value="__MANUAL__">✍️ Ketik Nama Manual...</option>
      </select>

      <button
        type="button"
        onClick={() => setIsManualMode(true)}
        title="Ketik nama manual jika tidak ada di daftar"
        className="rounded-lg border border-[#ded5c4] bg-[#faf7f2] p-2 text-xs text-[#5c6e63] hover:bg-[#eaf6f0] hover:text-[#2d946e] transition-colors"
      >
        <PenTool className="h-4 w-4" />
      </button>
    </div>
  );
}

