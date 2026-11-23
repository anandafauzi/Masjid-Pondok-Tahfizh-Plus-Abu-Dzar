-- Pengaruh jadwal khatib manual terhadap rotasi rolling.
-- SKIP     = perilaku lama: rotasi tetap maju, petugas terlewat.
-- POSTPONE = rotasi berhenti pada pekan ini, petugas mundur ke Jumat berikutnya.
DO $$ BEGIN
  CREATE TYPE "KhatibRotationEffect" AS ENUM ('SKIP', 'POSTPONE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "khatib_schedules"
  ADD COLUMN IF NOT EXISTS "rotationEffect" "KhatibRotationEffect" NOT NULL DEFAULT 'SKIP';
