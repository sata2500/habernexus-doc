import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Haber Nexus";

interface GenerateRssOptions {
  lang: string;
  categoryId?: string;
  categorySlug?: string;
}

/**
 * Global RSS XML Üretici
 * 
 * Flipboard, Apple News ve Feedly uyumlu, zengin metadata içeren RSS 2.0.
 */
export async function generateRssXml({ lang = "tr", categoryId, categorySlug }: GenerateRssOptions) {
  // Veri çekme kriterleri
  const where: any = {
    status: "PUBLISHED",
    lang: lang,
  };

  if (categoryId) where.categoryId = categoryId;
  if (categorySlug) where.category = { slug: categorySlug };

  const articles = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: {
      author: { select: { name: true } },
      category: { select: { name: true, slug: true } },
    },
  });

  // XML karakter escape fonksiyonu
  function escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  const items = articles
    .map((article) => {
      const link = `${BASE_URL}/article/${article.slug}`;
      const pubDate = article.publishedAt
        ? article.publishedAt.toUTCString()
        : article.updatedAt.toUTCString();

      // Kapak resmi
      const imageTag = article.coverImage 
        ? `\n      <media:content url="${article.coverImage}" medium="image" />`
        : "";

      // Tam metin (content:encoded) - HTML içindeki < ve > işaretlerini korumak için CDATA kullanılır
      const fullContent = `<![CDATA[${article.content}]]>`;

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(article.excerpt || article.title)}</description>
      <content:encoded>${fullContent}</content:encoded>${imageTag}
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      <dc:creator>${escapeXml(article.author.name)}</dc:creator>
      <category>${escapeXml(article.category?.name || "Haber")}</category>
    </item>`;
    })
    .join("\n");

  const channelTitle = categorySlug 
    ? `${escapeXml(SITE_NAME)} - ${categorySlug.toUpperCase()}`
    : escapeXml(SITE_NAME);

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
>
  <channel>
    <title>${channelTitle}</title>
    <link>${BASE_URL}</link>
    <description>Yeni nesil haber platformu — Gündemdeki en son haberleri, analizleri ve derinlemesine içerikleri keşfedin.</description>
    <language>${lang}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return rss;
}
