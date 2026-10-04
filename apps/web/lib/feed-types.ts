/** Haber akışı kartı için istemciye gönderilen hafif veri (içerik gövdesi yok). */
export interface FeedArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  viewCount: number;
  publishedAt: string | null;
  readingMinutes: number;
  category: { name: string; slug: string; color: string | null } | null;
  authorName: string;
  authorImage: string | null;
}

export interface FeedPage {
  items: FeedArticle[];
  nextCursor: string | null;
}
