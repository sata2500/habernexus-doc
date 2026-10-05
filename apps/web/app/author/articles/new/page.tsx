import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategoryOptions, getSuggestionForEditor, requireAuthor } from "@/lib/server/author-desk";
import { ArticleEditor } from "../../components/ArticleEditor";

export const dynamic = "force-dynamic";

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ oneri?: string }> }) {
  await requireAuthor();
  const { oneri } = await searchParams;
  const [categories, suggestion] = await Promise.all([
    getCategoryOptions(),
    oneri ? getSuggestionForEditor(oneri) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Link href="/author/articles" aria-label="Makalelerime dön" className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-border hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-display">Yeni haber</h1>
          <p className="text-sm text-muted-foreground truncate">{suggestion ? "Öneriden başlık ve özet dolduruldu" : "Taslak olarak kaydedebilir ya da hemen yayınlayabilirsin"}</p>
        </div>
      </div>
      <ArticleEditor
        article={{ id: null, slug: null, title: "", excerpt: "", content: "", coverImage: "", categoryId: "", status: "DRAFT" }}
        categories={categories}
        suggestion={suggestion}
      />
    </div>
  );
}
