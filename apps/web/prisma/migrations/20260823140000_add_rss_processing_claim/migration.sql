-- Keep the database enum aligned with prisma/schema.prisma.
ALTER TYPE "RssItemStatus" ADD VALUE IF NOT EXISTS 'EXPIRED_STALE';

ALTER TABLE "RssFeedItem"
  ADD COLUMN "processingAt" TIMESTAMP(3),
  ADD COLUMN "processingToken" TEXT;

CREATE UNIQUE INDEX "RssFeedItem_processingToken_key"
  ON "RssFeedItem"("processingToken");

ALTER TABLE "Article"
  ADD COLUMN "sourceRssItemId" TEXT;

CREATE UNIQUE INDEX "Article_sourceRssItemId_key"
  ON "Article"("sourceRssItemId");

ALTER TABLE "Article"
  ADD CONSTRAINT "Article_sourceRssItemId_fkey"
  FOREIGN KEY ("sourceRssItemId") REFERENCES "RssFeedItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
