import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { getCategoriesWithCount } from "@/lib/data";
import { getFeedPage } from "@/lib/feed";
import { ArticleFeed } from "@/components/article/ArticleFeed";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Son Haberler",
  description: "En son eklenen güncel haberler ve gelişmeler. Tüm kategorilerdeki en yeni haberleri takip edin.",
  alternates: {
    canonical: "/latest",
  },
};

type SearchParams = Promise<{ kategori?: string }>;

export default async function LatestArticlesPage({ searchParams }: { searchParams: SearchParams }) {
  const { kategori } = await searchParams;
  const categories = await getCategoriesWithCount();
  const activeCategory = categories.find((c) => c.slug === kategori)?.slug;
  // Kategori filtresi sayfanın ayrı bir kopyası sayılmasın (kanonik adres /latest)
  const firstPage = await getFeedPage({ limit: 12, categorySlug: activeCategory });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 space-y-6 md:space-y-10">
      <div className="text-center space-y-2 md:space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-gradient-primary text-white mb-1 md:mb-2 shadow-glow">
          <TrendingUp className="h-6 w-6 md:h-8 md:w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl md:text-5xl font-bold font-display tracking-tight">
          Son Haberler
        </h1>
        <p className="text-sm md:text-lg text-muted-foreground leading-relaxed">
          Tüm haberler, yayınlanma tarihine göre en yeniden en eskiye. Kaydırdıkça yenileri yüklenir.
        </p>
      </div>

      {/* Kategori filtresi */}
      <nav aria-label="Kategoriye göre filtrele" className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
        <ul className="flex sm:flex-wrap sm:justify-center gap-2 w-max sm:w-auto">
          <li>
            <Link
              href="/latest"
              scroll={false}
              aria-current={!activeCategory ? "page" : undefined}
              className={cn(
                "inline-flex items-center h-9 px-4 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap",
                !activeCategory
                  ? "bg-primary-500 border-primary-500 text-white"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
            >
              Tümü
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/latest?kategori=${c.slug}`}
                scroll={false}
                aria-current={activeCategory === c.slug ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-semibold border transition-colors whitespace-nowrap",
                  activeCategory === c.slug
                    ? "bg-primary-500 border-primary-500 text-white"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || "#888" }} />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Başlık sırası: haber kartları h3; ekran okuyucular için liste başlığı */}
      <h2 className="sr-only">Haber listesi</h2>
      <ArticleFeed
        key={activeCategory ?? "all"}
        initialItems={firstPage.items}
        initialCursor={firstPage.nextCursor}
        mode="infinite"
        category={activeCategory}
      />
    </div>
  );
}
