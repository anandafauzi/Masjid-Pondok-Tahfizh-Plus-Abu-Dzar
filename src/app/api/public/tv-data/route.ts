import { buildTvData } from "@/lib/public-data";
import { ok, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await buildTvData();
    return ok(data);
  } catch (error) {
    console.error(error);
    return serverError("Gagal memuat data TV");
  }
}
