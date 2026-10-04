import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";

export interface TrendItemData {
  keyword: string;
  trafficScore: number;
  searchVolume: string;
  exploreUrl?: string;
  category?: string;
  pubDate?: Date;
}

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  },
  customFields: {
    item: [
      ["ht:approx_traffic", "traffic"],
      ["ht:picture", "picture"],
      ["ht:news_item", "newsItems", { keepArray: true }],
    ],
  },
});

/**
 * Güncel Google Trends RSS ve JSON kaynaklarından anlık arama trendlerini çeker.
 * Resmi yeni URL: https://trends.google.com/trending/rss?geo=TR
 */
export async function fetchGoogleTrends(geo: string = "TR"): Promise<TrendItemData[]> {
  const trends: TrendItemData[] = [];
  const geoUpper = geo.toUpperCase();

  // 1. Yeni Güncel Google Trends RSS URL'si
  try {
    const rssUrl = `https://trends.google.com/trending/rss?geo=${geoUpper}`;
    const feed = await parser.parseURL(rssUrl);

    for (const item of feed.items || []) {
      const keyword = item.title?.trim();
      if (!keyword) continue;

      const itemAny = item as unknown as Record<string, unknown>;
      const trafficRaw = (itemAny.traffic as string) || "10.000+";
      
      let trafficScore = 50;
      const numMatch = trafficRaw.replace(/[^0-9]/g, "");
      if (numMatch) {
        const num = parseInt(numMatch, 10);
        if (num >= 500) trafficScore = 100;
        else if (num >= 200) trafficScore = 95;
        else if (num >= 100) trafficScore = 85;
        else if (num >= 50) trafficScore = 75;
        else if (num >= 20) trafficScore = 65;
        else trafficScore = 50;
      }

      trends.push({
        keyword,
        searchVolume: trafficRaw,
        trafficScore,
        exploreUrl: item.link || `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&geo=${geoUpper}`,
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      });
    }

    if (trends.length > 0) {
      console.log(`[Google Trends] RSS ile ${trends.length} trend başarıyla çekildi (${geoUpper}).`);
      return trends;
    }
  } catch (rssErr) {
    console.warn(`[Google Trends] RSS fetch hatası, JSON deneniyor:`, rssErr);
  }

  // 2. Fallback: Google Trends JSON API
  try {
    const jsonUrl = `https://trends.google.com/trends/api/dailytrends?hl=tr&geo=${geoUpper}&ns=15`;
    const res = await fetch(jsonUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (res.ok) {
      const rawText = await res.text();
      const cleanJsonText = rawText.replace(/^\)\]\}'\s*/, "");
      const data = JSON.parse(cleanJsonText);

      const days = data?.default?.trendingSearchesDays || [];
      for (const day of days) {
        for (const search of day.trendingSearches || []) {
          const keyword = search.title?.query?.trim();
          if (!keyword) continue;

          const formattedTraffic = search.formattedTraffic || "10.000+";
          trends.push({
            keyword,
            searchVolume: formattedTraffic,
            trafficScore: 75,
            exploreUrl: search.shareUrl || `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&geo=${geoUpper}`,
            pubDate: day.date ? new Date(day.date) : new Date(),
          });
        }
      }
    }
  } catch (jsonErr) {
    console.error(`[Google Trends] JSON fallback hatası:`, jsonErr);
  }

  return trends;
}

/**
 * Trend verilerini çeker ve veritabanındaki GoogleTrend tablosuna günceller/kaydeder.
 */
export async function syncGoogleTrends(): Promise<{ synced: number; geo: string }> {
  const settings = await prisma.systemSettings.findFirst();
  if (settings?.googleTrendsEnabled === false) {
    console.log("[Google Trends] Devre dışı bırakılmış.");
    return { synced: 0, geo: "DISABLED" };
  }

  const geo = settings?.googleTrendsGeo || "TR";
  const trends = await fetchGoogleTrends(geo);
  let synced = 0;

  for (const trend of trends) {
    await prisma.googleTrend.upsert({
      where: { keyword: trend.keyword },
      create: {
        keyword: trend.keyword,
        searchVolume: trend.searchVolume,
        exploreUrl: trend.exploreUrl,
        country: geo,
        trafficScore: trend.trafficScore,
      },
      update: {
        searchVolume: trend.searchVolume,
        trafficScore: trend.trafficScore,
        updatedAt: new Date(),
      },
    });
    synced++;
  }

  return { synced, geo };
}
