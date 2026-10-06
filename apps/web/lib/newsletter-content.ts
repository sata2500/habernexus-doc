import "server-only";

import { getAppUrl } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { readingMinutes } from "@/lib/utils";

export interface NewsletterArticle {
  title: string;
  excerpt: string | null;
  slug: string;
  coverImage: string | null;
  category: { name: string } | null;
  readingMinutes: number;
}

const MAX_PER_CATEGORY = 2;

/**
 * Bültene girecek haberler: son 24 saatin en çok okunanları, aynı kategoriden en fazla 2 haber
 * (tek konunun bülteni doldurmaması için). 24 saatte yeterli haber yoksa 48 saate genişler.
 */
export async function selectNewsletterArticles(limit = 7): Promise<NewsletterArticle[]> {
  for (const hours of [24, 48]) {
    const rows = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - hours * 3_600_000) } },
      orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }],
      take: 60,
      select: { title: true, excerpt: true, slug: true, coverImage: true, content: true, category: { select: { name: true } } },
    });
    const perCategory = new Map<string, number>();
    const picked: typeof rows = [];
    const rest: typeof rows = [];
    for (const r of rows) {
      const key = r.category?.name ?? "";
      const n = perCategory.get(key) ?? 0;
      if (n < MAX_PER_CATEGORY) { picked.push(r); perCategory.set(key, n + 1); } else rest.push(r);
      if (picked.length >= limit) break;
    }
    // Çeşitlilik yetmezse kalan yerler en çok okunanlarla doldurulur
    const final = [...picked, ...rest].slice(0, limit);
    if (final.length >= 3 || hours === 48) {
      return final.map(({ content, ...a }) => ({ ...a, readingMinutes: readingMinutes(content) }));
    }
  }
  return [];
}

/** Konu satırı: günün manşeti (açılma oranı genel tarih başlığından belirgin şekilde yüksektir) */
export function newsletterSubject(articles: NewsletterArticle[]) {
  const top = articles[0]?.title ?? "";
  const subject = top ? `Günün özeti: ${top}` : "Haber Nexus günlük bülten";
  return subject.length > 90 ? `${subject.slice(0, 87).replace(/\s+\S*$/, "")}…` : subject;
}

export function newsletterDateLabel(date = new Date()) {
  return date.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const BASE_URL = getAppUrl;

/** Bülten bağlantıları: hangi haberin bültenden okunduğu ölçülebilsin diye UTM parametreleri (canonical ayrı) */
export function newsletterLink(path: string, campaign = "daily") {
  const url = new URL(path, BASE_URL());
  url.searchParams.set("utm_source", "newsletter");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

/** Düz metin sürümü (HTML göstermeyen istemciler ve spam filtreleri için) */
export function newsletterText(articles: NewsletterArticle[], opts: { unsubscribeUrl: string; settingsUrl?: string | null; dateLabel: string }) {
  const lines = [`HABER NEXUS — GÜNÜN ÖZETİ`, opts.dateLabel, ""];
  articles.forEach((a, i) => {
    lines.push(`${i + 1}. ${a.title}`);
    if (a.excerpt) lines.push(a.excerpt);
    lines.push(newsletterLink(`/article/${a.slug}`), "");
  });
  lines.push("—", "Bu e-postayı Haber Nexus günlük bültenine abone olduğunuz için aldınız.");
  if (opts.settingsUrl) lines.push(`Gönderim saatini değiştir: ${opts.settingsUrl}`);
  lines.push(`Abonelikten çık: ${opts.unsubscribeUrl}`);
  return lines.join("\n");
}
