"use client";

import { SessionProvider } from "next-auth/react";

/**
 * SessionProvider hanya dibutuhkan oleh halaman admin/login.
 *
 * Sebelumnya provider ini dipasang di root layout sehingga setiap halaman
 * publik (beranda, jadwal, kompas, TV) ikut memuat runtime next-auth dan
 * memanggil `/api/auth/session`. Sekarang hanya route admin & auth yang
 * dibungkus, sehingga halaman publik jauh lebih ringan.
 */
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
