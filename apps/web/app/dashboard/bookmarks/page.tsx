import Link from "next/link";
import { Bookmark } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { FeedArticleCard } from "@/components/article/FeedArticleCard";
import { getUserBookmarks } from "../actions";
import { RemoveBookmarkButton } from "./RemoveBookmarkButton";

export const metadata = { title: "Kaydedilenler" };

export default async function BookmarksPage() {
  const bookmarks = await getUserBookmarks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Kaydedilen haberler</h1>
        <p className="text-muted-foreground text-sm">
          Sonra okumak için kaydettiğiniz haberler{bookmarks.length > 0 ? ` · ${bookmarks.length} haber` : ""}.
        </p>
      </div>

      {bookmarks.length > 0 && <h2 className="sr-only">Kaydedilen haberler listesi</h2>}
      {bookmarks.length > 0 ? (
        <ul className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-6">
          {bookmarks.map((b, i) => (
            <li key={b.id} className="relative">
              <FeedArticleCard article={b.article} layout="vertical" priority={i < 3} note={`${formatDate(b.createdAt)} kaydedildi`} />
              <RemoveBookmarkButton articleId={b.article.id} title={b.article.title} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border">
          <span className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bookmark className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold mb-1">Okuma listeniz boş</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-5">
            Haberlerdeki kaydet düğmesine dokunarak sonra okumak istediklerinizi buraya ekleyebilirsiniz.
          </p>
          <Link href="/" className="inline-flex items-center px-5 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold">
            Haberleri keşfet
          </Link>
        </div>
      )}
    </div>
  );
}
