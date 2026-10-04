import Parser from "rss-parser";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const parser = new Parser({
  timeout: 10000,
  headers: {
    // Bazı yayıncılar tanımadığı istemcileri engelliyor; tarayıcı uyumlu ve kendini tanıtan bir kimlik
    "User-Agent": "Mozilla/5.0 (compatible; HaberNexusBot/1.0; +https://habernexus.com)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["description", "description"],
    ],
  },
});

/**
 * Verilen URL'nin SHA-256 hash'ini üretir (dedup için).
 */
function hashUrl(url: string): string {
  return createHash("sha256").update(url.trim().toLowerCase()).digest("hex");
}

/**
 * HTML/XML etiketlerini temizler, özet metni döner.
 */
function cleanText(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

/**
 * Bir RSS kaynağını tarar ve yeni öğeleri DB'ye kaydeder.
 * Zaten var olan URL'leri atlar (urlHash ile dedup).
 */
export async function scanRssSource(
  sourceId: string,
  feedUrl: string,
  maxAgeHours?: number,
): Promise<{ added: number; skipped: number; error?: string }> {
  let added = 0;
  let skipped = 0;
  // Maksimum haber yaşı (Ayarlar > Otomasyon); 0 = sınırsız
  const maxAge = maxAgeHours ?? (await prisma.systemSettings.findFirst({ select: { maxNewsAgeHours: true } }))?.maxNewsAgeHours ?? 24;

  try {
    const feed = await parser.parseURL(feedUrl);

    for (const item of feed.items.slice(0, 30)) {
      const url = item.link?.trim();
      if (!url) {
        skipped++;
        continue;
      }

      const urlHash = hashUrl(url);

      // Hızlı dedup: hash zaten var mı?
      const exists = await prisma.rssFeedItem.findUnique({
        where: { urlHash },
        select: { id: true },
      });

      if (exists) {
        skipped++;
        continue;
      }

      // Görsel URL'si bul
      const itemAny = item as unknown as Record<string, unknown>;
      let imageUrl: string | undefined;
      if (
        itemAny.mediaContent &&
        typeof itemAny.mediaContent === "object" &&
        itemAny.mediaContent !== null &&
        (itemAny.mediaContent as Record<string, unknown>).$ &&
        typeof (
          (itemAny.mediaContent as Record<string, unknown>)
            .$ as Record<string, unknown>
        ).url === "string"
      ) {
        imageUrl = (
          (itemAny.mediaContent as Record<string, unknown>)
            .$ as Record<string, unknown>
        ).url as string;
      } else if (
        itemAny.mediaThumbnail &&
        typeof itemAny.mediaThumbnail === "object" &&
        itemAny.mediaThumbnail !== null &&
        (itemAny.mediaThumbnail as Record<string, unknown>).$ &&
        typeof (
          (itemAny.mediaThumbnail as Record<string, unknown>)
            .$ as Record<string, unknown>
        ).url === "string"
      ) {
        imageUrl = (
          (itemAny.mediaThumbnail as Record<string, unknown>)
            .$ as Record<string, unknown>
        ).url as string;
      }

      // Enclosure'dan görsel bul
      if (!imageUrl && item.enclosure?.url?.match(/\.(jpg|jpeg|png|webp)/i)) {
        imageUrl = item.enclosure.url;
      }

      const parsedDate = item.pubDate ? new Date(item.pubDate) : null;
      // Geçersiz ya da ileri tarihli yayın zamanlarına güvenme
      const pubDate = parsedDate && !Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() <= Date.now() + 10 * 60_000 ? parsedDate : null;
      if (maxAge > 0 && pubDate && Date.now() - pubDate.getTime() > maxAge * 3_600_000) {
        // Çok eski haberleri hiç kaydetme
        skipped++;
        continue;
      }

      await prisma.rssFeedItem.create({
        data: {
          sourceId,
          title: item.title?.trim() || "Başlıksız",
          url,
          urlHash,
          excerpt: cleanText(item.contentSnippet || item.content || item.summary || ""),
          imageUrl,
          publishedAt: pubDate,
        },
      });
      added++;
    }

    // Kaynağın son tarama zamanını güncelle
    await prisma.rssFeedSource.update({
      where: { id: sourceId },
      data: { lastFetchedAt: new Date(), fetchError: null },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await prisma.rssFeedSource.update({
      where: { id: sourceId },
      data: { fetchError: errorMsg, lastFetchedAt: new Date() },
    });
    return { added, skipped, error: errorMsg };
  }

  return { added, skipped };
}

/**
 * Tüm aktif RSS kaynaklarını tarar.
 */
export async function scanAllActiveSources(): Promise<{
  total: number;
  totalAdded: number;
  totalSkipped: number;
  errors: string[];
}> {
  const sources = await prisma.rssFeedSource.findMany({
    where: { isActive: true },
    select: { id: true, url: true, name: true },
  });
  const settings = await prisma.systemSettings.findFirst({ select: { maxNewsAgeHours: true } });

  let totalAdded = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (const source of sources) {
    const result = await scanRssSource(source.id, source.url, settings?.maxNewsAgeHours ?? 24);
    totalAdded += result.added;
    totalSkipped += result.skipped;
    if (result.error) {
      errors.push(`${source.name}: ${result.error}`);
    }
  }

  return {
    total: sources.length,
    totalAdded,
    totalSkipped,
    errors,
  };
}
