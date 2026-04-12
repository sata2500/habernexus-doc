import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getAuthorArticles } from "./actions";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PlusCircle, Eye, FileText, Newspaper, Pencil, TrendingUp } from "lucide-react";

function getStatusLabel(status: string) {
  if (status === "PUBLISHED") return { label: "Yayında", variant: "success" as const };
  if (status === "DRAFT") return { label: "Taslak", variant: "warning" as const };
  return { label: status, variant: "default" as const };
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default async function AuthorDashboardPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  const articles = await getAuthorArticles();

  const published = articles.filter((a) => a.status === "PUBLISHED");
  const drafts = articles.filter((a) => a.status === "DRAFT");
  const totalViews = published.reduce((sum, a) => sum + a.viewCount, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Başlık ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">
            Hoş Geldin, {session?.user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm">Şu anki durum özetin ve hızlı erişim alanın.</p>
        </div>
        <Link href="/author/articles/new">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all focus:ring-4 focus:ring-primary-500/30 shadow-lg shadow-primary-500/20 cursor-pointer">
            <PlusCircle className="h-4 w-4" />
            Yeni Haber Yaz
          </button>
        </Link>
      </div>

      {/* ── İstatistik Kartları ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Newspaper, label: "Toplam Makale", value: articles.length, color: "text-blue-500 bg-blue-500/10" },
          { icon: TrendingUp, label: "Toplam Görüntülenme", value: totalViews.toLocaleString("tr-TR"), color: "text-green-500 bg-green-500/10" },
          { icon: FileText, label: "Taslak", value: drafts.length, color: "text-amber-500 bg-amber-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="glass-strong rounded-2xl p-5 border border-border shadow-soft flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold font-(family-name:--font-outfit)">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Makaleler Listesi ─────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-(family-name:--font-outfit)">Son Makalelerim</h2>
          <Link href="/author/articles" className="text-sm text-primary-600 hover:underline">Tümünü Gör</Link>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium text-foreground">Henüz hiç makale yok</p>
            <p className="text-sm text-muted-foreground mt-1">İlk haberinizi eklemek için "Yeni Haber Yaz" butonunu kullanın.</p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
            {articles.slice(0, 5).map((article) => {
              const { label, variant } = getStatusLabel(article.status);
              return (
                <div key={article.id} className="flex items-center justify-between gap-4 p-4 bg-background hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.category?.name} · {formatDate(article.publishedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={variant}>{label}</Badge>
                    <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" /> {article.viewCount}
                    </span>
                    <Link href={`/author/articles/${article.id}/edit`} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
