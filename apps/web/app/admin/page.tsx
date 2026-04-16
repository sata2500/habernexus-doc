import { getAdminStats } from "./actions";
import { redirect } from "next/navigation";
import { Users, FileText, Eye, TrendingUp, Newspaper, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  if (!stats) redirect("/");

  const statCards = [
    { icon: Users, label: "Toplam Kullanıcı", value: stats.totalUsers, sub: `+${stats.newUsers} bu hafta`, color: "text-blue-500 bg-blue-500/10" },
    { icon: FileText, label: "Toplam Makale", value: stats.totalArticles, sub: `${stats.publishedArticles} yayında · ${stats.draftArticles} taslak`, color: "text-green-500 bg-green-500/10" },
    { icon: Eye, label: "Toplam Görüntülenme", value: stats.totalViews.toLocaleString("tr-TR"), sub: "Tüm zamanlar", color: "text-purple-500 bg-purple-500/10" },
    { icon: Newspaper, label: "Aktif Kategori", value: stats.categories.length, sub: "Tüm kategoriler", color: "text-amber-500 bg-amber-500/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">Platform Özeti</h1>
          <p className="text-muted-foreground text-sm">Haber Nexus yönetim merkezi.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <ShieldCheck className="h-4 w-4 text-red-500" />
          <span className="text-xs font-medium text-red-600 dark:text-red-400">Admin Modu</span>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass-strong rounded-2xl p-5 border border-border shadow-soft flex items-start gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold font-(family-name:--font-outfit) truncate">{card.value}</p>
              <p className="text-xs font-medium text-foreground">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Kategori Dağılımı */}
      <div className="glass-strong rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold font-(family-name:--font-outfit)">Kategori Dağılımı</h2>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="divide-y divide-border">
          {stats.categories.map((cat) => {
            const count = cat._count.articles;
            const pct = stats.publishedArticles > 0 ? Math.round((count / stats.publishedArticles) * 100) : 0;
            return (
              <div key={cat.id} className="flex items-center gap-4 px-5 py-3">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ background: cat.color || "#888" }} />
                <span className="text-sm flex-1">{cat.name}</span>
                <div className="hidden sm:flex items-center gap-3 flex-1 max-w-[200px]">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
                <span className="text-sm font-semibold w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hızlı Erişim */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/users" className="flex items-center gap-4 p-5 glass-strong rounded-2xl border border-border hover:border-primary-500/50 transition-all group">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center"><Users className="h-6 w-6 text-blue-500" /></div>
          <div><p className="font-semibold">Kullanıcı Yönetimi</p><p className="text-sm text-muted-foreground">Rolleri düzenle ve listele</p></div>
        </Link>
        <Link href="/admin/articles" className="flex items-center gap-4 p-5 glass-strong rounded-2xl border border-border hover:border-primary-500/50 transition-all group">
          <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center"><FileText className="h-6 w-6 text-green-500" /></div>
          <div><p className="font-semibold">İçerik Moderasyonu</p><p className="text-sm text-muted-foreground">Tüm makaleleri yönet</p></div>
        </Link>
      </div>
    </div>
  );
}
