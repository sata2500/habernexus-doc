import { prisma } from "@/lib/prisma";
import { GoogleTrendsClient } from "./components/GoogleTrendsClient";

export const dynamic = "force-dynamic";

export default async function GoogleTrendsPage() {
  const trends = await prisma.googleTrend.findMany({
    orderBy: { trafficScore: "desc" },
    include: {
      items: {
        include: {
          rssItem: {
            select: { id: true, title: true, status: true, aiScore: true },
          },
        },
      },
    },
    take: 30,
  });

  const settings = await prisma.systemSettings.findFirst();

  return (
    <div className="space-y-8">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Google Trends & Karar Yönetim Masası
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Google arama trendlerini canlı izleyin, RSS akışları ile karşılaştırın ve yüksek ilgi gören konuları hızla haberleştirin.
          </p>
        </div>
      </div>

      <GoogleTrendsClient trends={trends} settings={settings} />
    </div>
  );
}
