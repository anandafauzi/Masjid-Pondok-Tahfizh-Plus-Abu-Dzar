import type { Metadata } from "next";
import { getSessionUser } from "@/lib/api";
import { getMosqueSettings } from "@/lib/settings";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminLoginView } from "@/components/admin/admin-login-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel Admin | Masjid Pondok Tahfizh Plus Abu Dzar",
  description: "Panel Administrasi Masjid Pondok Tahfizh Plus Abu Dzar",
  manifest: "/manifest-admin.json",
  applicationName: "Admin DKM",
  appleWebApp: {
    capable: true,
    title: "Admin DKM",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-admin-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-admin-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icon-admin-192.png",
    apple: [
      { url: "/icon-admin-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, mosque] = await Promise.all([
    getSessionUser(),
    getMosqueSettings(),
  ]);

  if (!user) {
    return (
      <AdminLoginView
        logoUrl={mosque.logoUrl}
        mosqueName={mosque.mosqueName}
      />
    );
  }

  return (
    <AdminShell
      user={{
        name: user.name || "Admin",
        email: user.email,
        role: user.role,
      }}
      logoUrl={mosque.logoUrl}
    >
      {children}
    </AdminShell>
  );
}
