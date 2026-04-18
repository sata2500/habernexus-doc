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
