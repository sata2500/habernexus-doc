-- Aynı sağlayıcı hesabına ait yinelenen bağlantıları temizler (en güncel kayıt kalır) ve
-- tekrarını önlemek için benzersizlik kuralı ekler. better-auth 1.7.7 yinelenen kayıtta girişi durdurur. Idempotent.

DELETE FROM "Account" a
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY "providerId", "accountId"
    ORDER BY "updatedAt" DESC, "createdAt" DESC, id DESC
  ) AS rn
  FROM "Account"
) d
WHERE a.id = d.id AND d.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
