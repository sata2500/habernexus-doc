import { NextRequest } from "next/server";
import { generateRssXml } from "@/lib/rss-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string; slug: string }> }
) {
  const { lang, slug } = await params;
  
  try {
    const xml = await generateRssXml({ lang, categorySlug: slug });
    
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=1200, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error(`Category RSS error [${lang}/${slug}]:`, error);
    return new Response("Error generating category RSS feed", { status: 500 });
  }
}
