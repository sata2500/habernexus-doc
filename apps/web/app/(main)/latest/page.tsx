import Link from "next/link";
import { getLatestArticles, estimateReadingTime } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, Newspaper, TrendingUp } from "lucide-react";
import Image from "next/image";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { getCardGlowStyles } from "@/lib/utils";

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
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-primary text-white mb-2 shadow-glow animate-pulse-glow">
          <TrendingUp className="h-8 w-8" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-display tracking-tight">
          Son Haberler
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Tüm kategorilerdeki en yeni gelişmeleri sıcağı sıcağına takip edin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {latestArticles.map((article) => (
          <Link key={article.id} href={`/article/${article.slug}`} className="group block">
            <Card
              variant="interactive"
              noPadding
              className="overflow-hidden h-full flex flex-col shine rounded-2xl card-360-border bg-card/65 hover:bg-card transition-all duration-300 ease-out"
              style={getCardGlowStyles(article.category?.color)}
            >
              <div className="h-56 relative overflow-hidden bg-muted flex items-center justify-center">
                {article.coverImage ? (
                  <Image
                    src={article.coverImage}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-750"
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
                  <Newspaper className="h-16 w-16 text-muted-foreground/20" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {article.category && (
                  <div className="absolute top-4 left-4 z-10">
                    <Badge
                      variant="default"
                      className="backdrop-blur-md bg-card/85 text-xs font-bold shadow-sm flex items-center gap-1.5"
                      style={{ color: article.category.color || "inherit" }}
                    >
                      <DynamicIcon
                        name={article.category.icon}
                        fallback={Newspaper}
                        className="h-3.5 w-3.5"
                        style={{ color: article.category.color || "currentColor" }}
                      />
                      {article.category.name}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1 justify-between">
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-[var(--art-color)] mb-3 font-semibold">
                    <Clock className="h-4 w-4" />
                    {article.publishedAt ? formatRelative(article.publishedAt) : "Yeni"}
                  </div>

                  <h3 className="text-xl font-bold font-display leading-snug mb-3 group-hover:text-[var(--art-color)] transition-colors duration-300 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1 leading-relaxed">
                    {article.excerpt || "Bu haberin detaylarını okumak için tıklayın..."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border mt-auto">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      src={article.author.image || undefined}
                      fallback={article.author.name}
                      size="sm"
                      className="ring-2 ring-[var(--art-color)]/70"
                    />
                    <span className="font-semibold text-foreground">{article.author.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5" />
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
