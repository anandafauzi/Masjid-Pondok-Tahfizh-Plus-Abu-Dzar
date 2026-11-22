-- Klaim pengiriman pengingat harus atomik agar cron + kirim manual tidak
-- mengirim email yang sama dua kali.
ALTER TYPE "ReminderStatus" ADD VALUE IF NOT EXISTS 'SENDING';

ALTER TABLE "reminder_logs" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);

-- Versi cache publik bersama untuk invalidasi lintas instance.
CREATE TABLE IF NOT EXISTS "app_meta" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "app_meta_pkey" PRIMARY KEY ("key")
);

INSERT INTO "app_meta" ("key", "value", "updatedAt")
VALUES ('publicDataVersion', 0, NOW())
ON CONFLICT ("key") DO NOTHING;
