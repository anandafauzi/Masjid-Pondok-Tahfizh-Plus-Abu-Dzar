// Server Component wrapper — segment config is valid here (not in "use client" files)
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TvDisplay } from "./TvDisplay";

export default function TVPage() {
  return <TvDisplay />;
}
