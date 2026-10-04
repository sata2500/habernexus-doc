-- Yapay zekâ ayarları: seslendirme modeli, editoryal kriterler ve güncel varsayılan modeller. Idempotent.

ALTER TABLE "SystemSettings"
  ADD COLUMN IF NOT EXISTS "aiAnalyzerPrompt" TEXT,
  ADD COLUMN IF NOT EXISTS "aiTtsModel" TEXT NOT NULL DEFAULT 'google:gemini-3.8-flash-tts';

ALTER TABLE "SystemSettings" ALTER COLUMN "aiAnalyzerModel" SET DEFAULT 'google:gemini-3.5-flash-lite';
ALTER TABLE "SystemSettings" ALTER COLUMN "aiWriterModel" SET DEFAULT 'google:gemini-3.8-flash';
ALTER TABLE "SystemSettings" ALTER COLUMN "aiWriterImageModel" SET DEFAULT 'google:gemini-3.1-flash-image';
