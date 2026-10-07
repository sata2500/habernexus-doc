import { rssResponse } from "@/lib/rss-utils";

/** Dile göre akış: /rss/tr, /rss/en */
export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return rssResponse({ lang, selfPath: `/rss/${encodeURIComponent(lang)}` });
}
