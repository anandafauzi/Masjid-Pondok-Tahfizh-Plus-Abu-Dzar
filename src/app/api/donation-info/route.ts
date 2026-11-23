import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getSessionUser,
  ok,
  readJsonBody,
  serverError,
  unauthorized,
} from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import {
  getAdminDonationInfo,
  normalizeDonationInput,
} from "@/lib/donation";
import { revalidateAllAppPaths } from "@/lib/revalidate";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    return ok(await getAdminDonationInfo());
  } catch (error) {
    console.error(error);
    return serverError("Gagal memuat info donasi");
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const body = await readJsonBody(request);
    const parsed = normalizeDonationInput(body);
    if (!parsed.ok) return badRequest(parsed.error);

    const { title, notes, qrImageUrl, isActive, accounts } = parsed.value;

    const setting = await prisma.$transaction(async (tx) => {
      const existing = await tx.donationSetting.findFirst({
        orderBy: { id: "asc" },
      });
      const accountRows = accounts.map((account, index) => ({
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        displayOrder: index,
      }));

      if (existing) {
        return tx.donationSetting.update({
          where: { id: existing.id },
          data: {
            title,
            notes,
            qrImageUrl,
            isActive,
            accounts: {
              deleteMany: {},
              create: accountRows,
            },
          },
        });
      }

      return tx.donationSetting.create({
        data: {
          id: "default",
          title,
          notes,
          qrImageUrl,
          isActive,
          accounts: { create: accountRows },
        },
      });
    });

    await writeAudit({
      adminId: user.id,
      action: "UPDATE_DONATION_INFO",
      entityType: "DonationSetting",
      entityId: setting.id,
      changeSummary: `Memperbarui info donasi (${accounts.length} rekening, ${
        qrImageUrl ? "QR terpasang" : "tanpa QR"
      })`,
    });

    revalidateAllAppPaths();
    return ok(await getAdminDonationInfo());
  } catch (error) {
    console.error(error);
    return serverError("Gagal menyimpan info donasi");
  }
}
