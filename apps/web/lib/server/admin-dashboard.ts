import "server-only";

import { prisma } from "@/lib/prisma";
import { configuredProviders, getTaskModel } from "@/lib/ai/client";
import { modelDisplayName } from "@/lib/ai/models";
import { getMigrationStatus } from "@/lib/server/db-migrations";
import { countQueue } from "@/lib/news/queries";

const DAY = 86_400_000;

export type TaskTone = "warning" | "error" | "info";

export interface DashboardTask {
  tone: TaskTone;
  title: string;
  detail: string;
  href: string;
  action: string;
}

/**
 * Admin genel bakış verisi: metrikler, yapılacaklar ve sistem durumu.
 * Her parça bağımsız hata toleranslıdır; biri başarısız olursa sayfa yine açılır.
 */
export async function getAdminDashboard() {
  const now = Date.now();
  const since7d = new Date(now - 7 * DAY);
  // "Bugün" Türkiye saatine göre (sunucu UTC'de çalışır; önceki hesap günü 3 saat kaydırıyordu)
  const istanbulDate = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  const startOfDay = new Date(`${istanbulDate}T00:00:00+03:00`);
  const settled = <T,>(p: Promise<T>, fallback: T) => p.catch((e) => { console.error("[Dashboard]", e); return fallback; });

  const [
    publishedTotal, publishedToday, published7d, drafts, totalViews,
    users, newUsers7d, comments7d, reactions7d,
    pendingSuggestions, openTickets, lastPublished, recentArticles, topArticles,
    settings, writerModel, migrations,
  ] = await Promise.all([
    settled(prisma.article.count({ where: { status: "PUBLISHED" } }), 0),
    settled(prisma.article.count({ where: { status: "PUBLISHED", publishedAt: { gte: startOfDay } } }), 0),
    settled(prisma.article.count({ where: { status: "PUBLISHED", publishedAt: { gte: since7d } } }), 0),
    settled(prisma.article.count({ where: { status: "DRAFT" } }), 0),
    settled(prisma.article.aggregate({ _sum: { viewCount: true } }).then((r) => r._sum.viewCount ?? 0), 0),
    settled(prisma.user.count(), 0),
    settled(prisma.user.count({ where: { createdAt: { gte: since7d } } }), 0),
    settled(prisma.comment.count({ where: { createdAt: { gte: since7d } } }), 0),
    // Tepki tablosu henüz yoksa (güncelleme bekliyor) null döner
    settled(prisma.articleReaction.count({ where: { createdAt: { gte: since7d } } }) as Promise<number | null>, null),
    settled(countQueue(), 0),
    settled(prisma.supportTicket.count({ where: { status: { not: "CLOSED" } } }), 0),
    settled(prisma.article.findFirst({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select: { publishedAt: true } }), null),
    settled(prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, slug: true, status: true, viewCount: true, updatedAt: true, category: { select: { name: true, color: true } } },
    }), []),
    settled(prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: since7d } },
      orderBy: { viewCount: "desc" },
      take: 5,
      select: { id: true, title: true, slug: true, viewCount: true },
    }), []),
    settled(prisma.systemSettings.findUnique({ where: { id: "global" } }), null),
    settled(getTaskModel("writer"), null),
    settled(getMigrationStatus().then((s) => s.pendingCount), 0),
  ]);

  const providers = configuredProviders();
  const daysSincePublish = lastPublished?.publishedAt ? Math.floor((now - lastPublished.publishedAt.getTime()) / DAY) : null;

  // ── Yapılacaklar: yöneticinin şu an ilgilenmesi gerekenler (önem sırasına göre)
  const tasks: DashboardTask[] = [];
  if (migrations > 0) {
    tasks.push({ tone: "error", title: `${migrations} veritabanı güncellemesi bekliyor`, detail: "Yeni özellikler bu güncellemeler uygulanana kadar çalışmaz.", href: "/admin/settings?tab=sistem", action: "Uygula" });
  }
  if (!providers.google && !providers.openrouter) {
    tasks.push({ tone: "error", title: "Yapay zekâ anahtarı tanımlı değil", detail: "AI yazar, analiz ve özetler çalışmıyor.", href: "/admin/settings?tab=yapay-zeka", action: "İncele" });
  }
  if (daysSincePublish !== null && daysSincePublish >= 2) {
    tasks.push({ tone: "warning", title: `Son ${daysSincePublish} gündür yeni haber yayınlanmadı`, detail: settings?.aiWriterAutoEnabled ? "Otomasyon açık ama haber üretilmiyor; yapay zekâ modellerini test edin." : "AI Yazar otomasyonu kapalı.", href: settings?.aiWriterAutoEnabled ? "/admin/settings?tab=yapay-zeka" : "/admin/ai-writer", action: "Kontrol et" });
  }
  if (pendingSuggestions > 0) {
    tasks.push({ tone: "info", title: `${pendingSuggestions} konu yazım sırasında`, detail: "Puanı eşiği geçen konular Karar Merkezi'nde sırayla yazılmayı bekliyor.", href: "/admin/karar-merkezi", action: "Göz at" });
  }
  if (openTickets > 0) {
    tasks.push({ tone: "info", title: `${openTickets} açık destek talebi`, detail: "Okurlardan gelen mesajlar yanıt bekliyor.", href: "/admin/support", action: "Yanıtla" });
  }
  if (drafts > 0) {
    tasks.push({ tone: "info", title: `${drafts} taslak makale`, detail: "Yayınlanmamış makaleler.", href: "/admin/articles", action: "Gör" });
  }

  return {
    metrics: { publishedTotal, publishedToday, published7d, drafts, totalViews, users, newUsers7d, comments7d, reactions7d },
    tasks,
    recentArticles,
    topArticles,
    system: {
      writerModel: modelDisplayName(writerModel),
      providers,
      automation: !!settings?.aiWriterAutoEnabled,
      lastPublishedAt: lastPublished?.publishedAt?.toISOString() ?? null,
    },
  };
}
