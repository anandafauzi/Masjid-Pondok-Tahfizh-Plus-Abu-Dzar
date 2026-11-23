import { getPublicDonationInfo } from "@/lib/donation";
import { ok, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Endpoint publik khusus web & Android. Tidak dipakai layar TV. */
export async function GET() {
  try {
    return ok(await getPublicDonationInfo());
  } catch (error) {
    console.error(error);
    return serverError("Gagal memuat info donasi");
  }
}
