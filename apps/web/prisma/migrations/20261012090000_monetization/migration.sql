-- Reklam ve ölçüm ayarları ile sponsor reklamları. Idempotent.
CREATE TABLE IF NOT EXISTS "MonetizationSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "gaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gaMeasurementId" TEXT,
    "vercelAnalyticsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "adsenseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "adsensePublisherId" TEXT,
    "adsTxtExtra" TEXT,
    "placements" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonetizationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SponsorAd" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "advertiser" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageUrlMobile" TEXT,
    "linkUrl" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "placements" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "weight" INTEGER NOT NULL DEFAULT 1,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SponsorAd_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SponsorAd_isActive_startsAt_idx" ON "SponsorAd"("isActive", "startsAt");
