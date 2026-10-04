-- Keep the database enum aligned with prisma/schema.prisma.
-- Idempotent: canlı veritabanına bu değişiklikler `db push` ile önceden uygulanmış olabilir.
ALTER TYPE "RssItemStatus" ADD VALUE IF NOT EXISTS 'EXPIRED_STALE';

ALTER TABLE "RssFeedItem"
  ADD COLUMN IF NOT EXISTS "processingAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processingToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RssFeedItem_processingToken_key"
  ON "RssFeedItem"("processingToken");

ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS "sourceRssItemId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Article_sourceRssItemId_key"
  ON "Article"("sourceRssItemId");

DO $$ BEGIN
  ALTER TABLE "Article"
    ADD CONSTRAINT "Article_sourceRssItemId_fkey"
    FOREIGN KEY ("sourceRssItemId") REFERENCES "RssFeedItem"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
