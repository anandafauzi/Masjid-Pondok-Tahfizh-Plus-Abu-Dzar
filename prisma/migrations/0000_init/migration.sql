-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('WEEKLY', 'DAILY');

-- CreateEnum
CREATE TYPE "IqamahMode" AS ENUM ('DELAY_MINUTES', 'FIXED_TIME');

-- CreateEnum
CREATE TYPE "KhutbahStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KhutbahStartMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mosque_settings" (
    "id" TEXT NOT NULL,
    "mosqueName" TEXT NOT NULL DEFAULT 'Masjid Pondok Tahfizh Plus Abu Dzar',
    "logoUrl" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT -6.442126,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 106.640654,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "mapUrl" TEXT NOT NULL DEFAULT 'https://maps.app.goo.gl/aLWZpi1UhasHeHEP7',
    "prayerCalculationMethod" TEXT NOT NULL DEFAULT 'MWL',
    "asrMethod" TEXT NOT NULL DEFAULT 'STANDARD',
    "prayerAdjustments" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mosque_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prayer_times" (
    "id" TEXT NOT NULL,
    "prayerDate" DATE NOT NULL,
    "imsak" TEXT NOT NULL,
    "fajr" TEXT NOT NULL,
    "sunrise" TEXT NOT NULL,
    "dhuhr" TEXT NOT NULL,
    "asr" TEXT NOT NULL,
    "maghrib" TEXT NOT NULL,
    "isha" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'calculated',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prayer_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrence_rules" (
    "id" TEXT NOT NULL,
    "ruleType" "RecurrenceType" NOT NULL,
    "weekday" INTEGER,
    "prayerName" TEXT,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrence_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imam_muadzin_schedules" (
    "id" TEXT NOT NULL,
    "scheduleDate" DATE NOT NULL,
    "prayerName" TEXT NOT NULL,
    "imamName" TEXT NOT NULL,
    "muadzinName" TEXT NOT NULL,
    "recurrenceRuleId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imam_muadzin_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imam_rolling_settings" (
    "id" TEXT NOT NULL,
    "imamName" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imam_rolling_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "khatib_rolling_settings" (
    "id" TEXT NOT NULL,
    "khatibName" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khatib_rolling_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "khatib_schedules" (
    "id" TEXT NOT NULL,
    "fridayDate" DATE NOT NULL,
    "khatibName" TEXT NOT NULL,
    "sermonTopic" TEXT,
    "backupKhatibName" TEXT,
    "recurrenceRuleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khatib_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kajian_schedules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "speakerName" TEXT NOT NULL,
    "bookOrTopic" TEXT,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3),
    "location" TEXT NOT NULL DEFAULT 'Masjid',
    "description" TEXT,
    "recurrenceRuleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kajian_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iqamah_settings" (
    "id" TEXT NOT NULL,
    "prayerName" TEXT NOT NULL,
    "mode" "IqamahMode" NOT NULL DEFAULT 'DELAY_MINUTES',
    "delayMinutes" INTEGER NOT NULL DEFAULT 15,
    "fixedIqamahTime" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iqamah_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "islamic_advice" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceReference" TEXT,
    "authorOrSource" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "islamic_advice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "running_texts" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "running_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "display_settings" (
    "id" TEXT NOT NULL,
    "slideIntervalSeconds" INTEGER NOT NULL DEFAULT 10,
    "autoRotateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tickerSpeed" INTEGER NOT NULL DEFAULT 50,
    "tickerEnabled" BOOLEAN NOT NULL DEFAULT true,
    "showHijriDate" BOOLEAN NOT NULL DEFAULT true,
    "themeSettings" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "display_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "khutbah_sessions" (
    "id" TEXT NOT NULL,
    "fridayDate" DATE NOT NULL,
    "khatibName" TEXT NOT NULL,
    "sermonTopic" TEXT,
    "status" "KhutbahStatus" NOT NULL DEFAULT 'ACTIVE',
    "startMode" "KhutbahStartMode" NOT NULL DEFAULT 'MANUAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL DEFAULT 40,
    "scheduledStartAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3) NOT NULL,
    "startedById" TEXT,
    "endedById" TEXT,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "khutbah_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changeSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "prayer_times_prayerDate_key" ON "prayer_times"("prayerDate");

-- CreateIndex
CREATE INDEX "imam_muadzin_schedules_scheduleDate_idx" ON "imam_muadzin_schedules"("scheduleDate");

-- CreateIndex
CREATE UNIQUE INDEX "imam_muadzin_schedules_scheduleDate_prayerName_key" ON "imam_muadzin_schedules"("scheduleDate", "prayerName");

-- CreateIndex
CREATE UNIQUE INDEX "khatib_schedules_fridayDate_key" ON "khatib_schedules"("fridayDate");

-- CreateIndex
CREATE INDEX "kajian_schedules_startDateTime_idx" ON "kajian_schedules"("startDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "iqamah_settings_prayerName_key" ON "iqamah_settings"("prayerName");

-- CreateIndex
CREATE INDEX "khutbah_sessions_status_idx" ON "khutbah_sessions"("status");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_ipAddress_createdAt_idx" ON "login_attempts"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_createdAt_idx" ON "login_attempts"("createdAt");

-- AddForeignKey
ALTER TABLE "imam_muadzin_schedules" ADD CONSTRAINT "imam_muadzin_schedules_recurrenceRuleId_fkey" FOREIGN KEY ("recurrenceRuleId") REFERENCES "recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "khatib_schedules" ADD CONSTRAINT "khatib_schedules_recurrenceRuleId_fkey" FOREIGN KEY ("recurrenceRuleId") REFERENCES "recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kajian_schedules" ADD CONSTRAINT "kajian_schedules_recurrenceRuleId_fkey" FOREIGN KEY ("recurrenceRuleId") REFERENCES "recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "khutbah_sessions" ADD CONSTRAINT "khutbah_sessions_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "khutbah_sessions" ADD CONSTRAINT "khutbah_sessions_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

