import type { Metadata } from "next";
import { AuthSessionProvider } from "@/components/session-provider";

export const metadata: Metadata = {
  title: "Login Admin | Masjid Pondok Tahfizh Plus Abu Dzar",
  description: "Masuk ke Panel Administrasi Masjid Pondok Tahfizh Plus Abu Dzar",
  manifest: "/manifest-admin.json",
  applicationName: "Admin Masjid Abu Dzar",
  appleWebApp: {
    capable: true,
    title: "Admin Abu Dzar",
    statusBarStyle: "black-translucent",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}

