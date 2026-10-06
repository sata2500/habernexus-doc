-- Bülten yalnızca açık onayla: yeni kullanıcılar varsayılan olarak abone değildir. Idempotent.
ALTER TABLE "User" ALTER COLUMN "newsletterSubscribed" SET DEFAULT false;
