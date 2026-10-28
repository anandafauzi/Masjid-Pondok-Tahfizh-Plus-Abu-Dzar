"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Card, LoadingState, PageHeader, SectionHeading, Badge } from "@/components/ui";
import { ScrollText, ShieldCheck } from "lucide-react";

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changeSummary: string;
  createdAt: string;
  admin: { name: string; email: string } | null;
}

function actionColor(action: string): "green" | "red" | "blue" | "amber" | "slate" {
  if (action.startsWith("CREATE")) return "green";
  if (action.startsWith("DELETE") || action.startsWith("CANCEL")) return "red";
  if (action.startsWith("UPDATE")) return "amber";
  if (action.includes("KHUTBAH")) return "blue";
  return "slate";
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/audit-logs", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) setLogs(data);
      } catch {
        toast.error("Gagal memuat log");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <PageHeader
        icon={ScrollText}
        title="Log Aktivitas"
        description="100 aktivitas admin terakhir. Berguna untuk audit perubahan data."
      />

      <Card>
        <SectionHeading
          icon={ShieldCheck}
          title="Riwayat Aktivitas"
          description={`${logs.length} aktivitas tercatat.`}
        />
        {loading ? (
          <LoadingState />
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            Belum ada aktivitas admin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="bg-slate-900 text-[11px] font-semibold uppercase tracking-wider text-white">
                  <th className="rounded-l-xl px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Aksi</th>
                  <th className="px-4 py-3">Entitas</th>
                  <th className="rounded-r-xl px-4 py-3">Ringkasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">
                        {log.admin?.name ?? "-"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {log.admin?.email ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={actionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {log.changeSummary}
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
