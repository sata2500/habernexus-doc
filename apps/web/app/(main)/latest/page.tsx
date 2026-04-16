import Link from "next/link";
import { getLatestArticles, estimateReadingTime } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, Newspaper, TrendingUp } from "lucide-react";

export const metadata = {
  title: "Son Haberler",
  description: "En son eklenen güncel haberler ve gelişmeler. Tüm kategorilerdeki en yeni haberleri takip edin.",
  alternates: {
    canonical: "/latest",
  },
};



function formatRelative(date: Date): string {
  const diffMs = new Date().getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 24) return `${diffHours || 1} saat önce`;
  return `${diffDays} gün önce`;
}

export default async function LatestArticlesPage() {
  const latestArticles = await getLatestArticles(24);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-500/10 text-primary-500 mb-2">
            <TrendingUp className="h-8 w-8" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-(family-name:--font-outfit)">
          Son Haberler
        </h1>
        <p className="text-lg text-muted-foreground">
          Tüm kategorilerdeki en yeni gelişmeleri sıcağı sıcağına takip edin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {latestArticles.map((article: any) => (
          <Link key={article.id} href={`/article/${article.slug}`} className="group">
            <Card variant="interactive" noPadding className="overflow-hidden h-full flex flex-col hover:shadow-glow transition-all">
              <div
                className="h-56 relative overflow-hidden bg-muted flex items-center justify-center"
                style={
                  article.coverImage
                    ? { backgroundImage: `url(${article.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: `linear-gradient(135deg, ${article.category?.color || "#888"}25, ${article.category?.color || "#888"}08)` }
                }
              >
                {!article.coverImage && (
                  <Newspaper className="h-16 w-16 text-muted-foreground/20" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {article.category && (
                  <div className="absolute top-4 left-4">
                    <Badge
                      variant="default"
                      className="backdrop-blur-md bg-white/90 dark:bg-black/70 text-xs font-semibold shadow-sm"
                      style={{ color: article.category.color || "currentColor" }}
                    >
                      {article.category.name}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-primary-600 mb-3 font-medium">
                  <Clock className="h-4 w-4" />
                  {article.publishedAt ? formatRelative(article.publishedAt) : "Yeni"}
                </div>
                
                <h3 className="text-xl font-bold font-(family-name:--font-outfit) leading-snug mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-muted-foreground line-clamp-3 mb-6 flex-1">
                  {article.excerpt || "Bu haberin detaylarını okumak için tıklayın..."}
                </p>

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={article.author.image || undefined}
                      fallback={article.author.name}
                      size="sm"
                    />
                    <span className="font-medium text-foreground">{article.author.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {estimateReadingTime(article.content)} dk
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      
      {latestArticles.length === 0 && (
        <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border">
          Henüz hiç yayınlanmış makale bulunmuyor.
        </div>
      )}
    </div>
  );
}
