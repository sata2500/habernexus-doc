import "server-only";

import { getAppUrl } from "./utils";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/server/sanitize-html";
import { stripLeadingTitleHeading } from "@/lib/article-content";

const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Haber Nexus";
const LANG = /^[a-z]{2}$/;

interface GenerateRssOptions {
  lang: string;
  categorySlug?: string;
  /** Akışın kendi adresi (atom:link self) */
  selfPath: string;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** CDATA içinde "]]>" XML'i bozmasın */
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

/** RSS okuyucularında çalışsın diye site içi göreli bağlantılar tam adrese çevrilir */
const absolutize = (html: string, base: string) => html.replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`);

/**
 * RSS 2.0 akışı (Feedly, Flipboard, Apple News uyumlu). Geçersiz dil ya da olmayan kategori
 * için null döner (rota 404 verir). Tüm değerler XML'e kaçışlı yazılır; haber metni süzülür.
 */
export async function generateRssXml({ lang, categorySlug, selfPath }: GenerateRssOptions): Promise<string | null> {
  if (!LANG.test(lang)) return null;
  const base = getAppUrl();

  let categoryName: string | null = null;
  if (categorySlug) {
    if (!/^[a-z0-9-]{1,100}$/.test(categorySlug)) return null;
    const category = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { name: true } });
    if (!category) return null;
    categoryName = category.name;
  }

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", lang, ...(categorySlug && { category: { slug: categorySlug } }) },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      title: true, slug: true, excerpt: true, content: true, coverImage: true, publishedAt: true, updatedAt: true,
      author: { select: { name: true } },
      aiPersona: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  const items = articles.map((a) => {
    const link = `${base}/article/${a.slug}`;
    const body = absolutize(sanitizeHtml(stripLeadingTitleHeading(a.title, a.content)), base);
    return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(a.excerpt || a.title)}</description>
      <content:encoded>${cdata(body)}</content:encoded>${a.coverImage ? `\n      <media:content url="${escapeXml(a.coverImage)}" medium="image" />` : ""}
      <pubDate>${(a.publishedAt ?? a.updatedAt).toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <dc:creator>${escapeXml(a.aiPersona?.name || a.author.name)}</dc:creator>
      <category>${escapeXml(a.category?.name || "Haber")}</category>
    </item>`;
  }).join("\n");

  const title = categoryName ? `${SITE_NAME} - ${categoryName}` : SITE_NAME;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
>
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(categoryName ? `${categoryName} haberleri` : "Gündemdeki en son haberler, analizler ve derinlemesine içerikler.")}</description>
    <language>${lang}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(base + selfPath)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

/** Akış yanıtı: bulunamadıysa 404 */
export async function rssResponse(opts: GenerateRssOptions, cacheSeconds = 600) {
  try {
    const xml = await generateRssXml(opts);
    if (xml === null) return new Response("Akış bulunamadı", { status: 404 });
    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": `public, s-maxage=${cacheSeconds}, stale-while-revalidate=300`,
      },
    });
  } catch (error) {
    console.error("RSS error:", error);
    return new Response("Akış şu anda oluşturulamadı", { status: 500 });
  }
}
