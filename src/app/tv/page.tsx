// Server Component wrapper — segment config is valid here (not in "use client" files)
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TvViewport } from "@/components/tv/tv-viewport";
import { buildTvData } from "@/lib/public-data";
import { TvDisplay } from "./TvDisplay";

export default async function TVPage() {
  // Render data awal di server supaya layar TV tidak kosong sambil menunggu
  // fetch client. Client tetap melakukan polling untuk pembaruan berkala.
  let initialData = null;
  try {
    initialData = await buildTvData();
  } catch (error) {
    console.error("[TV] Gagal menyiapkan data awal:", error);
  }

  return (
    <TvViewport>
      <TvDisplay initialData={initialData} />
    </TvViewport>
  );
}
