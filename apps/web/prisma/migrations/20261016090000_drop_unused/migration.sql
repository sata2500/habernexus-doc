-- Kullanılmayan tablo ve sütunlar kaldırılır (kod hiçbirini okumuyor ya da yazmıyor).
-- Tüm ifadeler idempotenttir: tekrar çalıştırmak ya da nesnenin zaten olmaması sorun değildir.

-- Eski trend eşleştirme tablosu (haber hattı artık NewsStory üzerinden çalışıyor)
DROP TABLE IF EXISTS "GoogleTrendItem";
DROP TYPE IF EXISTS "TrendAction";

-- Eski model listesi (modeller artık sağlayıcı API'lerinden canlı okunuyor)
DROP TABLE IF EXISTS "AiModel";
DROP TYPE IF EXISTS "AiModelType";

-- RSS kaydı başına eski analiz alanları (analiz artık konu, yani NewsStory düzeyinde)
ALTER TABLE "RssFeedItem"
  DROP COLUMN IF EXISTS "aiScore",
  DROP COLUMN IF EXISTS "aiAnalysis",
  DROP COLUMN IF EXISTS "dismissed",
  DROP COLUMN IF EXISTS "processingAt",
  DROP COLUMN IF EXISTS "processingToken";

-- Kullanılmayan ayarlar
ALTER TABLE "SystemSettings"
  DROP COLUMN IF EXISTS "aiProvider",
  DROP COLUMN IF EXISTS "trendAutoPublishThreshold",
  DROP COLUMN IF EXISTS "trendSearchGenerateEnabled";

ALTER TABLE "Slider" DROP COLUMN IF EXISTS "mobileHeight";
