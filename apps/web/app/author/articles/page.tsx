import { getAuthorArticles } from "../actions";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PlusCircle, Eye, FileText, Pencil, Newspaper } from "lucide-react";
import { DeleteArticleButton } from "../components/DeleteArticleButton";

function getStatusLabel(status: string) {
  if (status === "PUBLISHED") return { label: "Yayında", variant: "success" as const };
  if (status === "DRAFT") return { label: "Taslak", variant: "warning" as const };
  return { label: status, variant: "default" as const };
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AuthorArticlesPage() {
  const articles = await getAuthorArticles();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Makalelerim</h1>
          <p className="text-muted-foreground text-sm">Toplam {articles.length} makale bulundu.</p>
        </div>
        <Link href="/author/articles/new">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all cursor-pointer">
            <PlusCircle className="h-4 w-4" />
            Yeni Haber Yaz
          </button>
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
          <Newspaper className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium">Henüz makale yok</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">İlk haberinizi eklemeye başlayın.</p>
          <Link href="/author/articles/new">
            <button className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all cursor-pointer">
              İlk Haberimi Yaz
            </button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
          {articles.map((article: any) => {
            const { label, variant } = getStatusLabel(article.status);
            return (
              <div key={article.id} className="flex items-center justify-between gap-4 p-4 bg-background hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {article.category?.name} · {formatDate(article.publishedAt || article.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={variant}>{label}</Badge>
                  <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" /> {article.viewCount}
                  </span>
                  <Link
                    href={`/author/articles/${article.id}/edit`}
                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <DeleteArticleButton articleId={article.id} articleTitle={article.title} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
