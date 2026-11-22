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
    // Structured metric so failed audit writes are visible/alertable without
    // failing the main operation (writeAudit stays best-effort).
    console.error(
      "[AUDIT][METRIC] audit_write_failed",
      JSON.stringify({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        adminId: input.adminId,
        error: error instanceof Error ? error.message : String(error),
      })
    );
    console.error("Failed to write audit log", error);
  }
}
