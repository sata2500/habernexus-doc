-- Karar Merkezi: aynı olayı anlatan RSS haberlerini konu (NewsStory) altında toplar. Idempotent.


DO $$ BEGIN
  CREATE TYPE "StoryStatus" AS ENUM ('NEW', 'READY', 'WRITING', 'PUBLISHED', 'DUPLICATE', 'LOW_SCORE', 'EXPIRED', 'DISMISSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StoryUrgency" AS ENUM ('BREAKING', 'TIME_SENSITIVE', 'NORMAL', 'EVERGREEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "RssFeedItem" ADD COLUMN IF NOT EXISTS "storyId" TEXT;

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "storyMinScore" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE IF NOT EXISTS "NewsStory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "tokens" TEXT[],
    "entities" TEXT[],
    "categoryName" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'NEW',
    "urgency" "StoryUrgency" NOT NULL DEFAULT 'NORMAL',
    "score" INTEGER NOT NULL DEFAULT 0,
    "aiScore" INTEGER,
    "trendScore" INTEGER NOT NULL DEFAULT 0,
    "trendKeyword" TEXT,
    "sourceCount" INTEGER NOT NULL DEFAULT 1,
    "itemCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "analysis" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "relatedArticleId" TEXT,
    "duplicateArticleId" TEXT,
    "articleId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processingAt" TIMESTAMP(3),
    "processingToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

CONSTRAINT "NewsStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NewsStory_articleId_key" ON "NewsStory"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NewsStory_processingToken_key" ON "NewsStory"("processingToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsStory_status_score_idx" ON "NewsStory"("status", "score");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsStory_lastSeenAt_idx" ON "NewsStory"("lastSeenAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NewsStory_expiresAt_idx" ON "NewsStory"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RssFeedItem_storyId_idx" ON "RssFeedItem"("storyId");

DO $$ BEGIN
  ALTER TABLE "RssFeedItem" ADD CONSTRAINT "RssFeedItem_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "NewsStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "NewsStory" ADD CONSTRAINT "NewsStory_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
