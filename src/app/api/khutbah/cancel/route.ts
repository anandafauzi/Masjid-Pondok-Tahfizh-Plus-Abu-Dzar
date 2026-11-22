import { NextRequest } from "next/server";
import { cancelKhutbah, KhutbahStateError } from "@/lib/khutbah";
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

    const session = await cancelKhutbah(String(body.id), user.id);

    await writeAudit({
      adminId: user.id,
      action: "CANCEL_KHUTBAH",
      entityType: "KhutbahSession",
      entityId: session.id,
      changeSummary: "Membatalkan sesi khutbah",
    });

    revalidateAllAppPaths();
    return ok({ session });
  } catch (error) {
    if (error instanceof KhutbahStateError) {
      return badRequest(error.message);
    }
    console.error(error);
    return serverError("Gagal membatalkan khutbah");
  }
}
