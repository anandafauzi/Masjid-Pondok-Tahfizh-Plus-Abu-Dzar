import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Amiri } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistem Informasi Masjid Abu Dzar | Pondok Tahfizh Plus",
  description:
    "Sistem Informasi & Jadwal Shalat Digital Masjid Pondok Tahfizh Plus Abu Dzar, Rumpin - Bogor",
  manifest: "/manifest.json",
  applicationName: "Masjid Abu Dzar",
  appleWebApp: {
    capable: true,
    title: "Masjid Abu Dzar",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#557a64",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} ${amiri.variable}`}>
      <body className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-sage-600 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
