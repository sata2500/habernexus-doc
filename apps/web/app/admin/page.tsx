import { getAdminStats } from "./actions";
import { redirect } from "next/navigation";
import { Users, FileText, Eye, TrendingUp, Newspaper, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  if (!stats) redirect("/");

  const statCards = [
    { icon: Users, label: "Toplam Kullanıcı", value: stats.totalUsers, sub: `+${stats.newUsers} bu hafta`, color: "text-primary- dark:text-primary- bg-primary-/10 dark:bg-primary-/15" },
    { icon: FileText, label: "Toplam Makale", value: stats.totalArticles, sub: `${stats.publishedArticles} yayında · ${stats.draftArticles} taslak`, color: "text-primary-600 dark:text-primary-400 bg-primary-500/10 dark:bg-primary-500/15" },
    { icon: Eye, label: "Toplam Görüntülenme", value: stats.totalViews.toLocaleString("tr-TR"), sub: "Tüm zamanlar", color: "text-primary- dark:text-primary- bg-primary-/10 dark:bg-primary-/15" },
    { icon: Newspaper, label: "Aktif Kategori", value: stats.categories.length, sub: "Tüm kategoriler", color: "text-primary- dark:text-primary- bg-primary-/10 dark:bg-primary-/15" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground tracking-tight">Platform Özeti</h1>
          <p className="text-muted-foreground text-sm">Haber Nexus yönetim merkezi.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 dark:bg-primary-500/15 border border-primary-500/20 rounded-xl">
          <ShieldCheck className="h-4.5 w-4.5 text-primary-500 animate-pulse" />
          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">Admin Modu</span>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="glass-strong hover-lift rounded-3xl p-5 border border-border shadow-soft flex items-start gap-4 hover:shadow-glow hover:border-primary-500/30 transition-all duration-300"
          >
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl md:text-3xl font-black font-display text-foreground tracking-tight truncate leading-none mb-1.5">{card.value}</p>
              <p className="text-xs font-bold text-foreground/80 tracking-wide uppercase">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Kategori Dağılımı */}
      <div className="glass-strong rounded-3xl border border-border/50 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="font-bold font-display text-lg text-foreground flex items-center gap-2">
              Kategori Dağılımı
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Kategorilere göre yayınlanmış makale oranları.</p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary-500" />
        </div>
        <div className="divide-y divide-border/40">
          {stats.categories.map((cat) => {
            const count = cat._count.articles;
            const pct = stats.publishedArticles > 0 ? Math.round((count / stats.publishedArticles) * 100) : 0;
            return (
              <div
                key={cat.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-6 py-4.5 hover:bg-muted/30 transition-colors duration-200"
              >
                <div className="flex items-center gap-3 min-w-[150px] shrink-0">
                  <div
                    className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-xs"
                    style={{ background: cat.color || "#888" }}
                  />
                  <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto sm:flex-1 sm:max-w-md">
                  <div className="flex-1 h-2 bg-muted/60 dark:bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 dark:bg-primary-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-20 shrink-0">
                    <span className="text-xs font-semibold text-muted-foreground w-10 text-right">{pct}%</span>
                    <span className="text-sm font-bold text-foreground text-right w-10">{count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hızlı Erişim */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/users"
          className="flex items-center gap-4 p-5 glass-strong hover-lift rounded-3xl border border-border/50 hover:border-primary-500/40 hover:shadow-glow transition-all duration-300 group"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary-/10 dark:bg-primary-/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Users className="h-6 w-6 text-primary- dark:text-primary-" />
          </div>
          <div>
            <p className="font-bold font-display text-foreground group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors duration-200">Kullanıcı Yönetimi</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Rolleri düzenle, listele ve yönet</p>
          </div>
        </Link>

        <Link
          href="/admin/articles"
          className="flex items-center gap-4 p-5 glass-strong hover-lift rounded-3xl border border-border/50 hover:border-primary-500/40 hover:shadow-glow transition-all duration-300 group"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary-500/10 dark:bg-primary-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
            <FileText className="h-6 w-6 text-primary-500 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-bold font-display text-foreground group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors duration-200">İçerik Moderasyonu</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Tüm makaleleri incele ve yönet</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
