import { NextRequest } from "next/server";
import { generateRssXml } from "@/lib/rss-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  const { lang } = await params;
  
  try {
    const xml = await generateRssXml({ lang });
    
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error(`RSS error [${lang}]:`, error);
    return new Response("Error generating RSS feed", { status: 500 });
  }
}
