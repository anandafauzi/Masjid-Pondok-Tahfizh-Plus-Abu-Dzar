import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Amiri } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { brandIconUrl, brandManifestUrl, getBrand } from "@/lib/brand";

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
  // Font Arab hanya dipakai untuk teks dekoratif, jadi jangan memblokir
  // permintaan awal/First Paint halaman publik dan TV.
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  const icon = brandIconUrl(brand.version);
  return {
    title: `Sistem Informasi ${brand.name} | Pondok Tahfizh Plus`,
    description: `Sistem Informasi & Jadwal Shalat Digital ${brand.name}, Rumpin - Bogor`,
    manifest: brandManifestUrl("public", brand.version),
    applicationName: brand.name,
    appleWebApp: {
      capable: true,
      title: brand.name,
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
      <body className="min-h-screen bg-[#faf7f2] text-[#19261f] font-sans antialiased selection:bg-[#2d946e] selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
