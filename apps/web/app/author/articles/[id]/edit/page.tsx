import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getArticleForEdit, getCategoryOptions } from "@/lib/server/author-desk";
import { ArticleEditor } from "../../../components/ArticleEditor";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kaydedildi?: string }>;
}) {
  const [{ id }, { kaydedildi }] = await Promise.all([params, searchParams]);
  const [article, categories] = await Promise.all([getArticleForEdit(id), getCategoryOptions()]);
  if (!article) notFound();

  const notice = kaydedildi === "yayin" ? "Haber yayınlandı." : kaydedildi === "taslak" ? "Taslak kaydedildi." : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Link href="/author/articles" aria-label="Makalelerime dön" className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-border hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-display">Haberi düzenle</h1>
          <p className="text-sm text-muted-foreground truncate">{article.title}</p>
        </div>
      </div>
      <ArticleEditor
        article={{
          id: article.id,
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt ?? "",
          content: article.content,
          coverImage: article.coverImage ?? "",
          categoryId: article.categoryId ?? "",
          status: article.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        }}
        categories={categories}
        initialNotice={notice}
      />
    </div>
  );
}
