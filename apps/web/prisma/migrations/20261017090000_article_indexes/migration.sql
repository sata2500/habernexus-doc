-- Haber listeleri için birleşik indeksler: yayındaki haberler yayın tarihine göre (ana sayfa, son haberler,
-- site haritası) ve kategori sayfaları. Tablo büyüdükçe bu sorgular tüm tabloyu taramaz.
CREATE INDEX IF NOT EXISTS "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "Article_categoryId_status_publishedAt_idx" ON "Article"("categoryId", "status", "publishedAt" DESC);

-- Gereksiz indeksler: slug sütunlarında zaten benzersiz (unique) indeks var; ikincisi yalnızca yazmayı yavaşlatır.
-- Veri silinmez.
DROP INDEX IF EXISTS "Article_slug_idx";
DROP INDEX IF EXISTS "StaticPage_slug_idx";
