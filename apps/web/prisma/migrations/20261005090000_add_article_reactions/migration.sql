-- Okur tepkileri (kişi başına haber başına tek tepki). Idempotent.

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArticleReaction" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArticleReaction_articleId_type_idx" ON "ArticleReaction"("articleId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "ArticleReaction_articleId_userId_key" ON "ArticleReaction"("articleId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ArticleReaction_articleId_visitorId_key" ON "ArticleReaction"("articleId", "visitorId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArticleReaction" ADD CONSTRAINT "ArticleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
