import Link from "next/link";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Eye, FileText, Info, MessageSquare, PenSquare,
  Settings2, Sparkles, Users, Wand2, XCircle, Heart, Brain,
} from "lucide-react";
import { requireRole } from "@/lib/server/authz";
import { getAdminDashboard, type TaskTone } from "@/lib/server/admin-dashboard";
import { cn, formatRelativeTime, formatViewCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TONE: Record<TaskTone, { icon: typeof Info; box: string; iconClass: string }> = {
  error: { icon: XCircle, box: "border-error/30 bg-error/5", iconClass: "text-error" },
  warning: { icon: AlertTriangle, box: "border-warning/40 bg-warning/10", iconClass: "text-warning" },
  info: { icon: Info, box: "border-border bg-card", iconClass: "text-primary-500" },
};

const QUICK_ACTIONS = [
  { label: "Yeni haber yaz", href: "/author/articles/new", icon: PenSquare },
  { label: "Karar Merkezi", href: "/admin/karar-merkezi", icon: Brain },
  { label: "AI Yazar", href: "/admin/ai-writer", icon: Wand2 },
  { label: "Ayarlar", href: "/admin/settings", icon: Settings2 },
];

export default async function AdminDashboardPage() {
  const session = await requireRole("ADMIN");
  const { metrics, tasks, recentArticles, topArticles, system } = await getAdminDashboard();
  const firstName = session.user.name?.split(" ")[0] ?? "";

  const kpis = [
    { label: "Yayındaki haber", value: metrics.publishedTotal.toLocaleString("tr-TR"), sub: `Bugün +${metrics.publishedToday} · 7 günde ${metrics.published7d}`, icon: FileText },
    { label: "Toplam okunma", value: formatViewCount(metrics.totalViews), sub: "Tüm haberler", icon: Eye },
    { label: "Kullanıcı", value: metrics.users.toLocaleString("tr-TR"), sub: `7 günde +${metrics.newUsers7d}`, icon: Users },
    {
      label: "Etkileşim (7 gün)",
      value: (metrics.comments7d + (metrics.reactions7d ?? 0)).toLocaleString("tr-TR"),
      sub: `${metrics.comments7d} yorum${metrics.reactions7d !== null ? ` · ${metrics.reactions7d} tepki` : ""}`,
      icon: Heart,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">Merhaba{firstName ? `, ${firstName}` : ""} 👋</h1>
        <p className="text-sm text-muted-foreground">Haber Nexus&apos;ta bugün neler oluyor?</p>
      </div>

      {/* Metrikler */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-card min-w-0">
            <div className="flex items-center gap-2 text-muted-foreground">
              <k.icon className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold truncate">{k.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold font-display tabular-nums">{k.value}</p>
            <p className="text-[11px] text-muted-foreground truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Yapılacaklar */}
      <section className="space-y-2" aria-labelledby="todo-title">
        <h2 id="todo-title" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">İlgilenmeniz gerekenler</h2>
        {tasks.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            Her şey yolunda; bekleyen bir iş yok.
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => {
              const tone = TONE[t.tone];
              return (
                <li key={t.title}>
                  <Link href={t.href} className={cn("flex items-center gap-3 rounded-2xl border p-3.5 hover:shadow-card transition-shadow", tone.box)}>
                    <tone.icon className={cn("h-5 w-5 shrink-0", tone.iconClass)} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{t.title}</span>
                      <span className="block text-xs text-muted-foreground">{t.detail}</span>
                    </span>
                    <span className="hidden sm:inline text-xs font-semibold text-primary-500 shrink-0">{t.action}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Hızlı işlemler */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold hover:border-primary-500/40 hover:bg-muted/50 transition-colors">
            <a.icon className="h-4 w-4 text-primary-500 shrink-0" />
            <span className="truncate">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Son güncellenen makaleler */}
        <section className="lg:col-span-2 min-w-0 rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-bold font-display">Son makaleler</h2>
            <Link href="/admin/articles" className="text-xs font-semibold text-primary-500">Tümü</Link>
          </div>
          <ul className="divide-y divide-border">
            {recentArticles.length === 0 && <li className="p-4 text-sm text-muted-foreground">Henüz makale yok.</li>}
            {recentArticles.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.category?.color || "#888" }} />
                <span className="flex-1 min-w-0">
                  <Link href={`/author/articles/${a.id}/edit`} className="block text-sm font-medium truncate hover:text-primary-500">{a.title}</Link>
                  <span className="block text-[11px] text-muted-foreground">
                    {a.category?.name ?? "Kategorisiz"} · {formatRelativeTime(a.updatedAt, { compact: true })}
                  </span>
                </span>
                <span className={cn(
                  "text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0",
                  a.status === "PUBLISHED" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {a.status === "PUBLISHED" ? "Yayında" : "Taslak"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4 min-w-0">
          {/* Bu hafta en çok okunan */}
          <section className="rounded-2xl border border-border bg-card shadow-card">
            <h2 className="font-bold font-display p-4 border-b border-border">Bu hafta en çok okunan</h2>
            <ol className="divide-y divide-border">
              {topArticles.length === 0 && <li className="p-4 text-sm text-muted-foreground">Son 7 günde yayınlanan haber yok.</li>}
              {topArticles.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-5 text-sm font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                  <Link href={`/article/${a.slug}`} className="flex-1 min-w-0 text-sm truncate hover:text-primary-500">{a.title}</Link>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatViewCount(a.viewCount)}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Sistem durumu */}
          <section className="rounded-2xl border border-border bg-card shadow-card p-4 space-y-2.5 text-sm">
            <h2 className="font-bold font-display flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary-500" /> Sistem</h2>
            <p className="flex justify-between gap-3"><span className="text-muted-foreground">Yazım modeli</span><span className="font-medium truncate text-right">{system.writerModel}</span></p>
            <p className="flex justify-between gap-3"><span className="text-muted-foreground">AI otomasyonu</span><span className={cn("font-medium", system.automation ? "text-success" : "text-muted-foreground")}>{system.automation ? "Açık" : "Kapalı"}</span></p>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">Sağlayıcılar</span>
              <span className="font-medium">
                {[system.providers.google && "Google", system.providers.openrouter && "OpenRouter"].filter(Boolean).join(" · ") || <span className="text-error">Yok</span>}
              </span>
            </p>
            <p className="flex justify-between gap-3"><span className="text-muted-foreground">Son yayın</span><span className="font-medium">{system.lastPublishedAt ? formatRelativeTime(system.lastPublishedAt) : "—"}</span></p>
            <Link href="/admin/settings?tab=sistem" className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-primary-500">
              Sistem ayrıntıları <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> Yorumları <Link href="/admin/comments" className="text-primary-500 font-semibold">Yorumlar</Link> sayfasından yönetebilirsiniz.
      </p>
    </div>
  );
}
