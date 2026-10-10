import { searchArticles, SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@/lib/data";
import { Search } from "lucide-react";
import { FeedArticleCard } from "@/components/article/FeedArticleCard";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function readQuery(params: Awaited<SearchParams>) {
  return typeof params.q === "string" ? params.q.trim().slice(0, SEARCH_MAX_LENGTH) : "";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const q = readQuery(await searchParams);
  return {
    title: q ? `"${q}" için arama sonuçları` : "Arama",
    description: "Haber Nexus'ta haber, analiz ve içerik arayın.",
    // Arama sonuçları Google'da dizine eklenmez (ince/tekrarlı içerik)
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = readQuery(await searchParams);
  const tooShort = query.length > 0 && query.length < SEARCH_MIN_LENGTH;
  const articles = query && !tooShort ? await searchArticles(query) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold font-display mb-5">Haber ara</h1>
        {/* Sayfadaki arama kutusu: sonuçlar sayfasında yeni arama için üst menüye dönmek gerekmez */}
        <form action="/search" role="search" className="relative">
          <label htmlFor="search-page-input" className="sr-only">Haberlerde ara</label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <input
            id="search-page-input"
            type="search"
            name="q"
            defaultValue={query}
            minLength={SEARCH_MIN_LENGTH}
            maxLength={SEARCH_MAX_LENGTH}
            enterKeyHint="search"
            placeholder="Kişi, kurum, konu…"
            className="w-full h-12 rounded-xl border border-border bg-card pl-12 pr-28 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold cursor-pointer focus-ring">
            Ara
          </button>
        </form>
        <p className="text-muted-foreground mt-4" aria-live="polite">
          {!query
            ? "Aramak istediğiniz kelimeyi yazın."
            : tooShort
              ? `En az ${SEARCH_MIN_LENGTH} karakter yazın.`
              : articles.length > 0
                ? <>&quot;<span className="font-semibold text-foreground">{query}</span>&quot; için {articles.length === 30 ? "en yeni 30" : articles.length} haber bulundu.</>
                : <>&quot;<span className="font-semibold text-foreground">{query}</span>&quot; için sonuç bulunamadı. Daha genel bir kelime deneyin.</>}
        </p>
      </div>

      {articles.length > 0 && <h2 className="sr-only">Arama sonuçları</h2>}
      {articles.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {articles.map((article, i) => (
            <li key={article.id}>
              <FeedArticleCard article={article} priority={i < 3} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
