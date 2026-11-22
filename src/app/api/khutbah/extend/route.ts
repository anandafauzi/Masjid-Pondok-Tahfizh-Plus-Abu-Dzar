import { NextRequest } from "next/server";
import { extendKhutbah, KhutbahStateError } from "@/lib/khutbah";
import {
  badRequest,
  getSessionUser,
  ok,
  readJsonBody,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await readJsonBody(request);
    if (!body) return badRequest("Format data tidak valid");
    if (!body.id) return badRequest("ID sesi khutbah wajib diisi");

    const extraMinutes = Number(body.extraMinutes);
    if (!Number.isFinite(extraMinutes) || extraMinutes <= 0) {
      return badRequest("Tambahan menit tidak valid");
    }

    const session = await extendKhutbah(
      String(body.id),
      Math.min(Math.trunc(extraMinutes), 120)
    );

    await writeAudit({
      adminId: user.id,
      action: "EXTEND_KHUTBAH",
      entityType: "KhutbahSession",
      entityId: session.id,
      changeSummary: `Memperpanjang khutbah ${extraMinutes} menit (tidak mereset sesi)`,
    });

    revalidateAllAppPaths();
    return ok({ session });
  } catch (error) {
    if (error instanceof KhutbahStateError) {
      return badRequest(error.message);
    }
    console.error(error);
    return serverError("Gagal memperpanjang khutbah");
  }
}
