import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserBookmarks } from "../actions";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Clock, Eye, Bookmark, Newspaper } from "lucide-react";
import { estimateReadingTime } from "@/lib/data";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default async function BookmarksPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session) return null;

  const bookmarks = await getUserBookmarks();
  type BookmarkItem = Awaited<ReturnType<typeof getUserBookmarks>>[number];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Kaydedilen Haberler</h1>
        <p className="text-muted-foreground text-sm">
          Sonradan okuyabilmek için kaydettiğiniz makalelerin arşivi ({bookmarks.length} Kayıt).
        </p>
      </div>

      {bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(bookmarks as BookmarkItem[]).map((bookmark) => {
            const article = bookmark.article;
            return (
              <Link key={bookmark.id} href={`/article/${article.slug}`} className="group h-full">
                <Card variant="interactive" noPadding className="overflow-hidden h-full flex flex-col relative">
                  {/* Bookmark Sticker */}
                  <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-xl">
                     <Bookmark className="h-4 w-4 text-primary-500 fill-primary-500" />
                  </div>

                  {/* Image */}
                  <div
                    className="h-40 relative overflow-hidden"
                    style={
                      article.coverImage
                        ? { backgroundImage: `url(${article.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: `linear-gradient(135deg, ${article.category?.color || "#888"}25, ${article.category?.color || "#888"}08)` }
                    }
                  >
                    {!article.coverImage && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Newspaper className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                    )}
                    {article.category && (
                      <div className="absolute bottom-3 left-3">
                        <Badge
                          variant="default"
                          className="backdrop-blur-md bg-white/80 dark:bg-black/50 text-[10px] px-1.5 py-0.5"
                          style={{ color: article.category.color || "#fff" }}
                        >
                          {article.category.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-semibold font-(family-name:--font-outfit) leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {article.title}
                    </h3>

                    <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {estimateReadingTime(article.content)} dk
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatCount(article.viewCount)}
                        </span>
                      </div>
                      <div>
                        {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(bookmark.createdAt)} eklendi
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bookmark className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium mb-2">Okuma Listeniz Boş</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Henüz hiçbir haberi kaydetmemişsiniz. Makaleleri okurken yer imi butonuna tıklayarak ilk kaydınızı oluşturabilirsiniz.
          </p>
          <Link href="/">
            <button className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-all focus:ring-4 focus:ring-primary-500/30">
              Haberleri Keşfet
            </button>
          </Link>
        </Card>
      )}
    </div>
  );
}
