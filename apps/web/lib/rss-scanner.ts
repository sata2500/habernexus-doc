import "server-only";

import Parser from "rss-parser";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { decodeEntities } from "@/lib/news/text";
import { fetchPublicPage } from "@/lib/server/remote-fetch";

type MediaField = { $?: { url?: unknown } } | undefined;
type FeedItem = Parser.Item & { mediaContent?: MediaField; mediaThumbnail?: MediaField };

const parser = new Parser<Record<string, never>, FeedItem>({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
});

const ITEMS_PER_FEED = 30;
const SOURCE_CONCURRENCY = 5;
const FEED_TIMEOUT_MS = 10_000;

/** Adresin SHA-256 özeti (tekrarlı kayıtları ayıklamak için) */
function hashUrl(url: string): string {
  return createHash("sha256").update(url.trim().toLowerCase()).digest("hex");
}

/** HTML etiketlerini ve karakter kodlarını temizleyip kısa düz metin döner */
function cleanText(html: string | undefined, max = 500): string {
  if (!html) return "";
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim().slice(0, max);
}

/** Yalnızca http(s) bağlantıları kabul edilir (javascript: vb. yönetim panelinde tıklanabilir olmasın) */
function safeHttpUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function imageOf(item: FeedItem) {
  const media = item.mediaContent?.$?.url ?? item.mediaThumbnail?.$?.url;
  if (typeof media === "string") return safeHttpUrl(media);
  if (item.enclosure?.url && (/^image\//i.test(item.enclosure.type ?? "") || /\.(jpe?g|png|webp)(\?|$)/i.test(item.enclosure.url))) {
    return safeHttpUrl(item.enclosure.url);
  }
  return null;
}

/**
 * Bir RSS kaynağını tarar ve yeni öğeleri kaydeder (adres özetine göre tekrarlar atlanır).
 * Akış, özel ağ adreslerine erişimi engelleyen güvenli indirici ile alınır.
 */
export async function scanRssSource(
  sourceId: string,
  feedUrl: string,
  maxAgeHours?: number,
): Promise<{ added: number; skipped: number; error?: string }> {
  // Maksimum haber yaşı (Ayarlar > Otomasyon); 0 = sınırsız
  const maxAge = maxAgeHours ?? (await prisma.systemSettings.findUnique({ where: { id: "global" }, select: { maxNewsAgeHours: true } }))?.maxNewsAgeHours ?? 24;

  try {
    const page = await fetchPublicPage(feedUrl, {
      timeoutMs: FEED_TIMEOUT_MS,
      maxBytes: 5 * 1024 * 1024,
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
    });
    const feed = await parser.parseString(page.html);

    const candidates: { url: string; urlHash: string; item: FeedItem; publishedAt: Date | null }[] = [];
    let skipped = 0;
    for (const item of feed.items.slice(0, ITEMS_PER_FEED)) {
      const url = safeHttpUrl(item.link);
      const parsedDate = item.isoDate || item.pubDate ? new Date(item.isoDate || item.pubDate!) : null;
      // Geçersiz ya da ileri tarihli yayın zamanlarına güvenme
      const publishedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) && parsedDate.getTime() <= Date.now() + 10 * 60_000 ? parsedDate : null;
      // Adresi olmayan ve çok eski haberler hiç kaydedilmez
      if (!url || (maxAge > 0 && publishedAt && Date.now() - publishedAt.getTime() > maxAge * 3_600_000)) {
        skipped++;
        continue;
      }
      candidates.push({ url, urlHash: hashUrl(url), item, publishedAt });
    }

    const existing = new Set(
      (await prisma.rssFeedItem.findMany({ where: { urlHash: { in: candidates.map((c) => c.urlHash) } }, select: { urlHash: true } }))
        .map((r) => r.urlHash),
    );
    const fresh = candidates.filter((c, i) => !existing.has(c.urlHash) && candidates.findIndex((o) => o.urlHash === c.urlHash) === i);
    // Eşzamanlı iki tarama aynı haberi eklemeye çalışırsa ikincisi sessizce atlanır
    const { count } = fresh.length
      ? await prisma.rssFeedItem.createMany({
          data: fresh.map(({ url, urlHash, item, publishedAt }) => ({
            sourceId,
            title: cleanText(item.title, 300) || "Başlıksız",
            url,
            urlHash,
            excerpt: cleanText(item.contentSnippet || item.content || item.summary || ""),
            imageUrl: imageOf(item),
            publishedAt,
          })),
          skipDuplicates: true,
        })
      : { count: 0 };

    await prisma.rssFeedSource.update({
      where: { id: sourceId },
      data: { lastFetchedAt: new Date(), fetchError: null },
    });
    return { added: count, skipped: skipped + candidates.length - count };
  } catch (err) {
    const errorMsg = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    await prisma.rssFeedSource.update({
      where: { id: sourceId },
      data: { fetchError: errorMsg, lastFetchedAt: new Date() },
    }).catch(() => {});
    return { added: 0, skipped: 0, error: errorMsg };
  }
}

/** Tüm aktif kaynakları aynı anda en fazla birkaçını tarayarak işler (biri yavaşsa diğerleri beklemez). */
export async function scanAllActiveSources(): Promise<{
  total: number;
  totalAdded: number;
  totalSkipped: number;
  errors: string[];
}> {
  const [sources, settings] = await Promise.all([
    prisma.rssFeedSource.findMany({ where: { isActive: true }, select: { id: true, url: true, name: true } }),
    prisma.systemSettings.findUnique({ where: { id: "global" }, select: { maxNewsAgeHours: true } }),
  ]);

  let totalAdded = 0;
  let totalSkipped = 0;
  const errors: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < sources.length) {
      const source = sources[next++];
      const result = await scanRssSource(source.id, source.url, settings?.maxNewsAgeHours ?? 24);
      totalAdded += result.added;
      totalSkipped += result.skipped;
      if (result.error) errors.push(`${source.name}: ${result.error}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(SOURCE_CONCURRENCY, sources.length) }, worker));

  return { total: sources.length, totalAdded, totalSkipped, errors };
}
