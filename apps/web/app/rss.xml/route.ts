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
import { generateRssXml } from "@/lib/rss-utils";

/**
 * Legacy RSS route bridge
 * Defaults to Turkish (tr) for backward compatibility
 */
export async function GET() {
  try {
    const xml = await generateRssXml({ lang: "tr" });
    
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("RSS error:", error);
    return new Response("Error generating RSS feed", { status: 500 });
  }
}
