import { getAllArticles } from "../actions";
import { redirect } from "next/navigation";
import { ArticleModerator } from "../components/ArticleModerator";
import { FileText } from "lucide-react";

export default async function AdminArticlesPage() {
  const articles = await getAllArticles().catch(() => null);
  if (!articles) redirect("/");

  const published = articles.filter((a) => a.status === "PUBLISHED").length;
  const drafts = articles.filter((a) => a.status === "DRAFT").length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">İçerik Moderasyonu</h1>
          <p className="text-muted-foreground text-sm">
            Toplam {articles.length} makale · {published} yayında · {drafts} taslak.
            Yayın durumunu değiştirmek veya silmek için sağdaki ikonları kullanın.
          </p>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Henüz hiç makale yok.</p>
        </div>
      ) : (
        <ArticleModerator articles={articles} />
      )}
    </div>
  );
}
