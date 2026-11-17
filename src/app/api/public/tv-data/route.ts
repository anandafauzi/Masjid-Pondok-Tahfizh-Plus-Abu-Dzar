import { buildTvData } from "@/lib/public-data";
import { ok, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get("date");
    const data = await buildTvData(date);
    return ok(data);
  } catch (error) {
    console.error(error);
    return serverError("Gagal memuat data TV");
  }
}
