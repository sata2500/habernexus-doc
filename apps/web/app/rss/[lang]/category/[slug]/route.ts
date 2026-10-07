import { rssResponse } from "@/lib/rss-utils";

/** Kategori akışı: /rss/tr/category/ekonomi */
export async function GET(_request: Request, { params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  return rssResponse({ lang, categorySlug: slug, selfPath: `/rss/${encodeURIComponent(lang)}/category/${encodeURIComponent(slug)}` }, 1200);
}
