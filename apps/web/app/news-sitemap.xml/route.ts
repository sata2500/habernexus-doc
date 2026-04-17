import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Haber Nexus";

export async function GET() {
  try {
    // Son 48 saatteki haberleri getir (Google News şartı)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: fortyEightHoursAgo,
        },
      },
      select: {
        title: true,
        slug: true,
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 1000, // Google News sitemap sınırı
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  ${articles
    .map((article) => {
      // Escape XML characters in title
      const safeTitle = article.title
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

      return `
  <url>
    <loc>${BASE_URL}/article/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>${SITE_NAME}</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt?.toISOString() || new Date().toISOString()}</news:publication_date>
      <news:title>${safeTitle}</news:title>
    </news:news>
  </url>`;
    })
    .join("")}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("News sitemap error:", error);
    return new Response("Error generating news sitemap", { status: 500 });
  }
}
