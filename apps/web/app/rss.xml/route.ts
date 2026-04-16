import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Haber Nexus";

/**
 * RSS 2.0 Feed Route Handler
 *
 * Google News ve içerik aggregator'ları için
 * makine-okunabilir haber akışı sağlar.
 *
 * @see https://www.rssboard.org/rss-specification
 */
export async function GET() {
  let articles: {
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
    category: { name: string } | null;
    author: { name: string };
  }[] = [];

  try {
    articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
        category: { select: { name: true } },
        author: { select: { name: true } },
      },
    });
  } catch {
    // Veritabanı bağlantısı yoksa boş XML döndür
  }

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

      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${link}</link>
      <description>${escapeXml(article.excerpt || article.title)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      <dc:creator>${escapeXml(article.author.name)}</dc:creator>${
        article.category
          ? `\n      <category>${escapeXml(article.category.name)}</category>`
          : ""
      }
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
>
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${BASE_URL}</link>
    <description>Yeni nesil haber platformu — Gündemdeki en son haberleri, analizleri ve derinlemesine içerikleri keşfedin.</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
    },
  });
}
