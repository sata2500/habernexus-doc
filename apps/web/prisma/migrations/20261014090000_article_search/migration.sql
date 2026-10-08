-- Türkçe tam metin arama: dizin sütunu, tetikleyici ve GIN indeksi. Idempotent.

-- Türkçe büyük harfler (İ→i, I→ı) veritabanının yerel ayarından bağımsız olarak küçültülür
CREATE OR REPLACE FUNCTION hn_search_normalize(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT lower(translate(coalesce(t, ''), 'İIÇĞÖŞÜÂÎÛ', 'iıçğöşüâîû')) $$;

-- Başlık (A) > spot (B) > metin (C) ağırlıklı arama vektörü; metindeki HTML etiketleri atılır
CREATE OR REPLACE FUNCTION hn_article_search(title text, excerpt text, content text) RETURNS tsvector
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT setweight(to_tsvector('turkish', hn_search_normalize(title)), 'A')
       || setweight(to_tsvector('turkish', hn_search_normalize(excerpt)), 'B')
       || setweight(to_tsvector('turkish', hn_search_normalize(regexp_replace(left(coalesce(content, ''), 200000), '<[^>]*>', ' ', 'g'))), 'C') $$;

ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

CREATE OR REPLACE FUNCTION hn_article_search_refresh() RETURNS trigger
  LANGUAGE plpgsql AS
$$ BEGIN
  NEW."searchVector" := hn_article_search(NEW.title, NEW.excerpt, NEW.content);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS "Article_search_refresh" ON "Article";
CREATE TRIGGER "Article_search_refresh"
  BEFORE INSERT OR UPDATE OF title, excerpt, content ON "Article"
  FOR EACH ROW EXECUTE FUNCTION hn_article_search_refresh();

-- Mevcut haberler (yalnızca boş olanlar; tekrar çalıştırmak ucuzdur)
UPDATE "Article" SET "searchVector" = hn_article_search(title, excerpt, content) WHERE "searchVector" IS NULL;

CREATE INDEX IF NOT EXISTS "Article_searchVector_idx" ON "Article" USING GIN ("searchVector");
