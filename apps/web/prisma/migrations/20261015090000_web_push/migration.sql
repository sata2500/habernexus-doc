-- Tarayıcı bildirimleri (Web Push). Idempotent.
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSuccessAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
DO $$ BEGIN
  ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "NotificationSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "autoBreaking" BOOLEAN NOT NULL DEFAULT false,
    "dailyLimit" INTEGER NOT NULL DEFAULT 3,
    "quietStartHour" INTEGER NOT NULL DEFAULT 23,
    "quietEndHour" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PushLog" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "automatic" BOOLEAN NOT NULL DEFAULT false,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PushLog_sentAt_idx" ON "PushLog"("sentAt");
