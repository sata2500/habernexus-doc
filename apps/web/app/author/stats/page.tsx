import { getAuthorArticles } from "../actions";
import { Card } from "@/components/ui/Card";
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Newspaper, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";

export default async function AuthorStatsPage() {
  const articles = await getAuthorArticles();

  // Hesaplamalar
  const totalArticles = articles.length;
  const publishedArticles = articles.filter(a => a.status === "PUBLISHED").length;
  const draftArticles = articles.filter(a => a.status === "DRAFT").length;
  const totalViews = articles.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);
  const avgViews = totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0;

  const topArticles = [...articles]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5);

  const stats = [
    { label: "Toplam Görüntülenme", value: totalViews.toLocaleString(), icon: Eye, bg: "bg-blue-500", trend: "+12%" },
    { label: "Yayınlanan Haber", value: publishedArticles, icon: CheckCircle2, bg: "bg-green-500", trend: null },
    { label: "Ortalama Okunma", value: avgViews, icon: TrendingUp, bg: "bg-purple-500", trend: "+5%" },
    { label: "Taslaklar", value: draftArticles, icon: Clock, bg: "bg-amber-500", trend: null },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold font-(family-name:--font-outfit)">İstatistikler</h1>
        <p className="text-muted-foreground text-sm">Haberlerinizin performansı ve etkileşim oranları.</p>
      </div>

      {/* ── Özet Kartları ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-5 border-none shadow-sm relative overflow-hidden group">
               <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 transition-transform group-hover:scale-110 ${item.bg}`} />
               <div className="relative">
                 <div className="flex items-center justify-between mb-3">
                   <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white ${item.bg}`}>
                     <Icon className="h-5 w-5" />
                   </div>
                   {item.trend && (
                     <span className="text-[10px] font-bold bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                       <ArrowUpRight className="h-2.5 w-2.5" /> {item.trend}
                     </span>
                   )}
                 </div>
                 <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                 <h3 className="text-2xl font-bold mt-1 font-(family-name:--font-outfit)">{item.value}</h3>
               </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── En Çok Okunanlar ────────────────────────── */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold font-(family-name:--font-outfit) flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              En Popüler Haberler
            </h3>
          </div>

          <div className="space-y-4">
            {topArticles.map((article, index) => (
              <div key={article.id} className="flex items-center gap-4 group">
                <div className="h-10 w-10 shrink-0 font-black text-xl text-muted-foreground/20 italic flex items-center justify-center group-hover:text-primary-500/30 transition-colors">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate group-hover:text-primary-600 transition-colors">{article.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{article.category?.name} · {article.status === 'PUBLISHED' ? 'Yayında' : 'Taslak'}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold font-(family-name:--font-outfit)">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    {article.viewCount}
                  </div>
                  <div className="w-16 h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-primary-500" 
                      style={{ width: `${(article.viewCount / (topArticles[0]?.viewCount || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {topArticles.length === 0 && (
              <div className="text-center py-10 opacity-50">
                <p className="text-sm">Henüz veri bulunmuyor.</p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Durum Dağılımı ────────────────────────── */}
        <Card className="p-6">
          <h3 className="font-bold font-(family-name:--font-outfit) mb-6">İçerik Dağılımı</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Yayında
                </span>
                <span className="font-bold">{publishedArticles}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                 <div className="h-full bg-green-500" style={{ width: `${(publishedArticles / (totalArticles || 1)) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Taslak
                </span>
                <span className="font-bold">{draftArticles}</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                 <div className="h-full bg-amber-500" style={{ width: `${(draftArticles / (totalArticles || 1)) * 100}%` }} />
              </div>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-primary-500/5 border border-primary-500/10">
              <div className="flex items-center gap-3 text-primary-600 mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Verimlilik</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bu ay toplam {totalViews} kez görüntülendiniz. En verimli kategoriniz {topArticles[0]?.category?.name || "henüz belli değil"}.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
