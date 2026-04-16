import { searchArticles, estimateReadingTime } from "@/lib/data";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, Eye, Search, Newspaper } from "lucide-react";

// Async SearchParams Arayüzü (Next.js 15)
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === "string" ? resolvedParams.q : "";

  return {
    title: q ? `"${q}" için arama sonuçları` : "Arama",
    description: q
      ? `"${q}" anahtar kelimesi için Haber Nexus arama sonuçları.`
      : "Haber Nexus'ta haber, analiz ve içerik arayın.",
    robots: {
      index: false,
      follow: true,
    },
  };
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const resolvedParams = await searchParams;
  const query = typeof resolvedParams.q === "string" ? resolvedParams.q : "";
  
  const articles = query ? await searchArticles(query) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col items-center justify-center text-center mb-16 mt-8">
        <div className="h-20 w-20 rounded-2xl flex items-center justify-center mb-6 shadow-xl bg-primary-500/10 text-primary-500">
          <Search className="h-10 w-10" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-(family-name:--font-outfit) mb-4">
          Arama Sonuçları
        </h1>
        {query ? (
          <p className="text-muted-foreground text-lg max-w-2xl">
            &quot;<span className="font-semibold text-foreground">{query}</span>&quot; kelimesi için toplam {articles.length} makale bulundu.
          </p>
        ) : (
          <p className="text-muted-foreground text-lg max-w-2xl">
            Lütfen aramak istediğiniz kelimeyi üstteki arama çubuğuna yazınız.
          </p>
        )}
      </div>

      {query && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link key={article.id} href={`/article/${article.slug}`} className="group">
              <Card variant="interactive" noPadding className="overflow-hidden h-full flex flex-col">
                <div className="h-48 relative overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  {article.coverImage ? (
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${article.category?.color || "#888"}25, ${article.category?.color || "#888"}08)`,
                      }}
                    />
                  )}
                  {!article.coverImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Newspaper className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  {article.category && (
                    <div className="absolute top-3 left-3">
                      <Badge
                        variant="default"
                        className="backdrop-blur-md bg-white/80 dark:bg-black/50 text-xs"
                        style={{ color: article.category.color || "#fff" }}
                      >
                        {article.category.name}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-base font-semibold font-(family-name:--font-outfit) leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {article.excerpt || "Devamını okumak için tıklayın..."}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={article.author?.image || undefined}
                        fallback={article.author?.name || "A"}
                        size="xs"
                      />
                      <span>{article.author?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {estimateReadingTime(article.content)} dk
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatCount(article.viewCount)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {query && articles.length === 0 && (
         <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border mt-8">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium text-foreground">Sonuç Bulunamadı</h3>
            <p className="text-muted-foreground mt-2">Daha farklı veya genel kelimelerle arama yapmayı deneyin.</p>
         </div>
      )}
    </div>
  );
}
