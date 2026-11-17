import type { Metadata } from "next";
import { getSessionUser } from "@/lib/api";
import { getMosqueSettings } from "@/lib/settings";
import { brandIconUrl, brandManifestUrl, getBrand } from "@/lib/brand";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminLoginView } from "@/components/admin/admin-login-view";
import { AuthSessionProvider } from "@/components/session-provider";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const icon = brandIconUrl(brand.version);
  return {
    title: `Panel Admin | ${brand.name}`,
    description: `Panel Administrasi ${brand.name}`,
    manifest: brandManifestUrl("admin", brand.version),
    applicationName: "Admin DKM",
    appleWebApp: {
      capable: true,
      title: "Admin DKM",
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        { url: icon, type: brand.iconType, sizes: "192x192" },
        { url: icon, type: brand.iconType, sizes: "512x512" },
      ],
      shortcut: icon,
      apple: [{ url: icon, type: brand.iconType, sizes: "180x180" }],
    },
  };
}

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
      <AuthSessionProvider>
        <AdminLoginView
          logoUrl={mosque.logoUrl}
          mosqueName={mosque.mosqueName}
        />
      </AuthSessionProvider>
    );
  }

  return (
    <AuthSessionProvider>
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
    </AuthSessionProvider>
  );
}
