-- Şema ile migration geçmişi arasındaki farkı kapatır.
-- Bu nesneler canlı veritabanına daha önce `prisma db push` ile eklenmiş olabileceği için
-- tüm ifadeler idempotenttir: hem boş bir veritabanında hem de mevcut canlı veritabanında
-- güvenle çalışır, var olan veriye dokunmaz.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TrendAction" AS ENUM ('PENDING', 'AUTO_PUBLISHED', 'SEARCH_GENERATED', 'SCHEDULED_DRAFT', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "issuer" TEXT;

-- AlterTable
ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS "analysisReport" JSONB,
  ADD COLUMN IF NOT EXISTS "plagiarismRate" INTEGER,
  ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "readabilityScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "seoScore" INTEGER;

-- AlterTable
ALTER TABLE "Slider" ADD COLUMN IF NOT EXISTS "mobileHeight" TEXT DEFAULT '300px';

-- AlterTable
ALTER TABLE "SystemSettings"
  ADD COLUMN IF NOT EXISTS "aiProvider" TEXT NOT NULL DEFAULT 'OPENROUTER',
  ADD COLUMN IF NOT EXISTS "googleTrendsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "googleTrendsGeo" TEXT NOT NULL DEFAULT 'TR',
  ADD COLUMN IF NOT EXISTS "maxNewsAgeHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS "trendAutoPublishThreshold" INTEGER NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS "trendSearchGenerateEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoogleTrend" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchVolume" TEXT,
    "exploreUrl" TEXT,
    "category" TEXT,
    "country" TEXT NOT NULL DEFAULT 'TR',
    "trafficScore" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoogleTrendItem" (
    "id" TEXT NOT NULL,
    "trendId" TEXT NOT NULL,
    "rssItemId" TEXT,
    "matchScore" INTEGER NOT NULL,
    "actionTaken" "TrendAction" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleTrendItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoogleTrend_keyword_key" ON "GoogleTrend"("keyword");
CREATE INDEX IF NOT EXISTS "GoogleTrend_keyword_idx" ON "GoogleTrend"("keyword");
CREATE INDEX IF NOT EXISTS "GoogleTrend_trafficScore_idx" ON "GoogleTrend"("trafficScore");
CREATE INDEX IF NOT EXISTS "GoogleTrend_country_idx" ON "GoogleTrend"("country");
CREATE INDEX IF NOT EXISTS "GoogleTrendItem_trendId_idx" ON "GoogleTrendItem"("trendId");
CREATE INDEX IF NOT EXISTS "GoogleTrendItem_rssItemId_idx" ON "GoogleTrendItem"("rssItemId");
CREATE INDEX IF NOT EXISTS "GoogleTrendItem_matchScore_idx" ON "GoogleTrendItem"("matchScore");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GoogleTrendItem" ADD CONSTRAINT "GoogleTrendItem_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "GoogleTrend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "GoogleTrendItem" ADD CONSTRAINT "GoogleTrendItem_rssItemId_fkey" FOREIGN KEY ("rssItemId") REFERENCES "RssFeedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
