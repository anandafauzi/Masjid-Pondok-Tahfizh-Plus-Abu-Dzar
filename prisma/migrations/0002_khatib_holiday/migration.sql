-- Opsi "Masjid Libur" pada jadwal khatib Jumat.
-- Kolom baru memakai DEFAULT false agar jadwal lama tetap normal.
ALTER TABLE "khatib_schedules" ADD COLUMN IF NOT EXISTS "isHoliday" BOOLEAN NOT NULL DEFAULT false;
