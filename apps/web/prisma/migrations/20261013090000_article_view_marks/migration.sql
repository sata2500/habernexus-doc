-- Görüntülenme tekilleştirme kayıtları. Idempotent.
CREATE TABLE IF NOT EXISTS "ArticleViewMark" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArticleViewMark_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ArticleViewMark_createdAt_idx" ON "ArticleViewMark"("createdAt");
