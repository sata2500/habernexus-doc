-- Bülten kayıtlarının saklama süresi için son değişiklik zamanı. Idempotent.
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
