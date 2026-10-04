import Link from "next/link";
import Image from "next/image";
import { Clock, Eye, Newspaper } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn, formatRelativeTime, getCardGlowStyles } from "@/lib/utils";
import type { FeedArticle } from "@/lib/feed-types";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

interface FeedArticleCardProps {
  article: FeedArticle;
  /** İlk görünen kartlarda görseli öncelikli yükle */
  priority?: boolean;
  badge?: React.ReactNode;
  /** "responsive": mobilde yatay/kompakt, büyük ekranda dikey. "vertical": her zaman dikey (yatay kaydırmalı listeler için) */
  layout?: "responsive" | "vertical";
  /** Kartın altında küçük bir açıklama satırı (ör. öneri nedeni) */
  note?: string;
}

/**
 * Haber akışı kartı.
 * Mobilde yatay ve kompakt (küçük görsel + başlık), tablet/masaüstünde dikey kart.
 */
export function FeedArticleCard({ article, priority, badge, layout = "responsive", note }: FeedArticleCardProps) {
  const color = article.category?.color || "#888888";
  const v = layout === "vertical";

  return (
    <Link
      href={`/article/${article.slug}`}
      className="group block h-full rounded-2xl focus-ring"
      style={getCardGlowStyles(article.category?.color)}
    >
      <article
        className={cn(
          "h-full flex overflow-hidden rounded-2xl",
          v ? "flex-col" : "sm:flex-col gap-3 sm:gap-0 p-3 sm:p-0",
          "bg-card/65 hover:bg-card border border-border card-360-border shadow-card",
          "transition-all duration-300 ease-out sm:hover:-translate-y-1"
        )}
      >
        {/* Görsel */}
        <div className={cn("relative shrink-0 overflow-hidden bg-muted", v ? "w-full h-36 sm:h-44" : "w-28 h-24 sm:w-full sm:h-44 rounded-xl sm:rounded-none")}>
          {article.coverImage ? (
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 640px) 112px, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${color}26, ${color}0a)` }}
            >
              <Newspaper className="h-7 w-7 sm:h-10 sm:w-10 text-muted-foreground/30" />
            </div>
          )}
          {badge && <div className={cn("absolute top-2 right-2 z-10", !v && "hidden sm:block")}>{badge}</div>}
        </div>

        {/* Metin */}
        <div className={cn("flex flex-col flex-1 min-w-0", v ? "p-4 sm:p-5" : "sm:p-5")}>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold mb-1 sm:mb-2 min-w-0">
            {article.category && (
              <span className="truncate" style={{ color }}>
                {article.category.name}
              </span>
            )}
            {article.publishedAt && (
              <span className="text-muted-foreground font-medium shrink-0" suppressHydrationWarning>
                {article.category ? "• " : ""}
                {formatRelativeTime(article.publishedAt, { compact: true })}
              </span>
            )}
          </div>

          <h3 className="font-bold font-display leading-snug text-[15px] sm:text-base line-clamp-3 sm:line-clamp-2 group-hover:text-[var(--art-color)] transition-colors">
            {article.title}
          </h3>

          {note && (
            <p className="mt-1.5 text-[11px] sm:text-xs font-medium text-accent-500 truncate">{note}</p>
          )}

          {article.excerpt && !note && (
            <p className="hidden sm:block mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {article.excerpt}
            </p>
          )}

          <div className="mt-auto pt-2 sm:pt-4 sm:mt-4 sm:border-t border-border flex items-center justify-between gap-2 text-[11px] sm:text-xs text-muted-foreground">
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <Avatar src={article.authorImage} fallback={article.authorName} size="xs" />
              <span className="font-medium truncate">{article.authorName}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {article.readingMinutes} dk
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {formatCount(article.viewCount)}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
