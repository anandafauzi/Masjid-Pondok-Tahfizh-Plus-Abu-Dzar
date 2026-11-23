-- Info donasi masjid: pengaturan bersama untuk web publik dan aplikasi Android.
-- Data ini sengaja tidak dimasukkan ke endpoint /api/public/tv-data.

CREATE TABLE "donation_settings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Donasi Masjid',
    "notes" TEXT,
    "qrImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "donation_accounts" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donation_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "donation_accounts_settingId_displayOrder_idx" ON "donation_accounts"("settingId", "displayOrder");

ALTER TABLE "donation_accounts" ADD CONSTRAINT "donation_accounts_settingId_fkey"
    FOREIGN KEY ("settingId") REFERENCES "donation_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
