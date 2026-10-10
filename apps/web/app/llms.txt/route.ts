import { getCategoriesWithCount } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { getAppUrl } from "@/lib/utils";

export const revalidate = 86400;

/**
 * llms.txt (https://llmstxt.org): yapay zekâ ajanlarına sitenin ne olduğunu ve içeriğe nereden
 * ulaşılacağını anlatan Markdown özet. Yoksa istek 404 sayfasına düşüp zaman aşımına uğruyordu.
 */
export async function GET() {
  const [settings, categories] = await Promise.all([getSiteSettings(), getCategoriesWithCount()]);
  const base = getAppUrl().replace(/\/$/, "");
  const name = settings.siteName || "Haber Nexus";
  const description = settings.siteDescription || "Türkiye ve dünyadan güncel haberler.";

  const lines = [
    `# ${name}`,
    "",
    `> ${description.replace(/\s+/g, " ").trim()}`,
    "",
    "Türkçe haber sitesi. Haberler kategorilere ayrılır; her haberin kendi sayfası, yayın tarihi ve kategorisi vardır.",
    "",
    "## Haber akışları",
    "",
    `- [Son haberler](${base}/latest): Tüm haberler, en yeniden eskiye`,
    `- [RSS akışı](${base}/rss.xml): Son haberlerin makine tarafından okunabilir listesi`,
    `- [Site haritası](${base}/sitemap.xml): Tüm haber ve sayfa adresleri`,
    `- [Haber site haritası](${base}/news-sitemap.xml): Son iki günün haberleri`,
    "",
    "## Kategoriler",
    "",
    ...categories.map((c) => `- [${c.name}](${base}/category/${c.slug})${c.description ? `: ${c.description}` : ""}`),
    "",
    "## Kurumsal",
    "",
    `- [Hakkımızda](${base}/about)`,
    `- [İletişim](${base}/contact)`,
    `- [Kullanım şartları](${base}/terms)`,
    `- [Gizlilik politikası](${base}/privacy)`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
