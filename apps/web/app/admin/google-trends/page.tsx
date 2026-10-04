import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettingsRow } from "@/lib/server/automation";
import { GoogleTrendsClient } from "./components/GoogleTrendsClient";

export const dynamic = "force-dynamic";

export default async function GoogleTrendsPage() {
  const [trends, settings] = await Promise.all([
    prisma.googleTrend.findMany({
      orderBy: { trafficScore: "desc" },
      include: {
        items: {
          orderBy: { matchScore: "desc" },
          include: { rssItem: { select: { id: true, title: true } } },
        },
      },
      take: 30,
    }),
    getSettingsRow(),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-3">
          <span className="h-11 w-11 rounded-2xl bg-primary-500/20 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary-500" />
          </span>
          Google Trends
        </h1>
        <p className="text-sm text-muted-foreground">
          Türkiye&apos;de şu an en çok aranan konular. RSS&apos;te karşılığı olan trendler öneriler arasında öne çıkarılır;
          karşılığı olmayanlar için tek tıkla haber yazabilirsiniz.
        </p>
        <p className="text-xs text-muted-foreground">
          {settings.googleTrendsEnabled
            ? <>Otomatik güncelleme açık · RSS taramasıyla birlikte çalışır ({settings.googleTrendsGeo}).</>
            : <>Otomatik güncelleme kapalı.</>}{" "}
          <Link href="/admin/settings?tab=otomasyon" className="font-semibold text-primary-500">Ayarlar</Link>
        </p>
      </div>

      <GoogleTrendsClient trends={trends} />
    </div>
  );
}
