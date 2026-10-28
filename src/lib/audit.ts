import { prisma } from "@/lib/prisma";

export interface AuditInput {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  changeSummary: string;
}

/** Best-effort audit logging: never breaks the main operation. */
export async function writeAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        changeSummary: input.changeSummary,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}
