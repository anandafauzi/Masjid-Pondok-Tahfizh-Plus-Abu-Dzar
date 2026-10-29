import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel Admin | Masjid Pondok Tahfizh Plus Abu Dzar",
  description: "Panel Administrasi Masjid Pondok Tahfizh Plus Abu Dzar",
  manifest: "/manifest-admin.json",
  applicationName: "Admin Masjid Abu Dzar",
  appleWebApp: {
    capable: true,
    title: "Admin Abu Dzar",
    statusBarStyle: "black-translucent",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  return (
    <AdminShell
      user={{
        name: user.name || "Admin",
        email: user.email,
        role: user.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
