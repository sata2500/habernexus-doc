import Link from "next/link";
import { ArrowRight, Brain, Filter, Gauge, PenLine, Rss, Timer } from "lucide-react";
import { requireRole } from "@/lib/server/authz";
import { getDecisionOverview, listStories, listTrends, STORY_PAGE_SIZE, TABS, type DecisionTab } from "@/lib/news/queries";
import { pageParam, param, type RawParams } from "@/lib/admin/list";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getRssSources } from "./actions";
import { PipelineBar } from "./components/PipelineBar";
import { StoryList } from "./components/StoryList";
import { TrendList } from "./components/TrendList";
import { FeedSourceManager } from "./components/FeedSourceManager";
import { ListSearch } from "../components/ListSearch";
import { Pagination } from "../components/ListControls";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BASE = "/admin/decision-center";

const FLOW = [
  { icon: Rss, title: "Topla", text: "Kaynaklar taranır" },
  { icon: Filter, title: "Grupla ve ele", text: "Aynı olay tek konu; tekrarlar elenir" },
  { icon: Gauge, title: "Puanla", text: "Değer, yaygınlık, tazelik, trend" },
  { icon: PenLine, title: "Yaz", text: "Sıradaki konu yazılır" },
];

/** İstek anı; kartlardaki "x dk önce" yazıları sunucu ve tarayıcıda aynı olsun diye tek yerden verilir */
const requestTime = () => Date.now();

export default async function DecisionCenterPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const tab = (TABS as readonly string[]).includes(param(params, "tab")) ? (param(params, "tab") as DecisionTab) : "queue";
  const q = param(params, "q");
  const pageNo = pageParam(params);
  const storyTab = tab !== "trends" && tab !== "sources";

  const [overview, list, trends, sources] = await Promise.all([
    getDecisionOverview(),
    storyTab ? listStories(tab, q, pageNo) : Promise.resolve(null),
    tab === "trends" ? listTrends() : Promise.resolve(null),
    tab === "sources" ? getRssSources() : Promise.resolve(null),
  ]);
  const c = overview.counts;

  const tabs: { id: DecisionTab; label: string; count?: number }[] = [
    { id: "queue", label: "Yazım sırası", count: c.queue },
    { id: "review", label: "Değerlendirilen", count: c.evaluating },
    { id: "published", label: "Yayınlanan" },
    { id: "rejected", label: "Elenen", count: c.eliminated },
    { id: "trends", label: "Trendler", count: c.trends },
    { id: "sources", label: "Kaynaklar", count: c.sources },
  ];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold font-display flex items-center gap-2.5">
            <Brain className="h-7 w-7 text-primary-500" /> Karar Merkezi
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Kaynaklardan gelen haberler olay bazında gruplanır, yayındakilerle karşılaştırılır, Google Trends ile ölçülür ve puanlanır.
            AI Yazar bu sıradan, en öncelikli konudan başlayarak yazar.
          </p>
        </div>
        <PipelineBar queueCount={c.queue} />
      </div>

      {/* Akış ve durum */}
      <section className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-card space-y-3">
        <ol className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {FLOW.map((f, i) => (
            <li key={f.title} className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2 min-w-0">
              <span className="h-7 w-7 shrink-0 rounded-full bg-primary-500/15 text-primary-500 flex items-center justify-center"><f.icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block text-xs font-bold">{i + 1}. {f.title}</span>
                <span className="block text-[11px] text-muted-foreground truncate">{f.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Son tarama: <strong className="text-foreground">{overview.lastScanAt ? formatRelativeTime(overview.lastScanAt) : "hiç"}</strong></span>
          <span>Son değerlendirme: <strong className="text-foreground">{overview.lastAnalysisAt ? formatRelativeTime(overview.lastAnalysisAt) : "hiç"}</strong></span>
          {c.newCount > 0 && <span><strong className="text-warning">{c.newCount}</strong> konu değerlendirme bekliyor</span>}
          {c.writing > 0 && <span><strong className="text-foreground">{c.writing}</strong> konu yazılıyor</span>}
          <span>Son 24 saatte <strong className="text-foreground">{c.published24h}</strong> haber yazıldı</span>
          <span>Yazım eşiği <strong className="text-foreground">{overview.minScore}</strong> puan</span>
          <span>
            AI Yazar otomasyonu: <strong className={overview.autoWriter.enabled ? "text-success" : "text-foreground"}>{overview.autoWriter.enabled ? `açık (her çalışmada ${overview.autoWriter.count})` : "kapalı"}</strong>
          </span>
          <Link href="/admin/settings?tab=automation" className="inline-flex items-center gap-1 font-semibold text-primary-500">
            <Timer className="h-3.5 w-3.5" /> Otomasyon ayarları <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Sekmeler */}
      <nav aria-label="Karar Merkezi bölümleri" className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
        <ul className="flex gap-1.5 w-max">
          {tabs.map((t) => (
            <li key={t.id}>
              <Link
                href={t.id === "queue" ? BASE : `${BASE}?tab=${t.id}`}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-sm font-semibold whitespace-nowrap transition-colors",
                  tab === t.id ? "bg-foreground text-background border-foreground" : "border-border bg-card hover:bg-muted"
                )}
              >
                {t.label}
                {t.count !== undefined && <span className={cn("tabular-nums text-xs", tab === t.id ? "opacity-70" : "text-muted-foreground")}>{t.count}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {storyTab && list && (
        <>
          <ListSearch placeholder="Konu ara" />
          {tab === "queue" && (
            <p className="text-xs text-muted-foreground">
              Puanı {overview.minScore} ve üzeri olan ya da öne alınan konular. AI Yazar en üstten başlar; yazmadan hemen önce yayındaki haberlerle son kez karşılaştırır.
            </p>
          )}
          {tab === "review" && (
            <p className="text-xs text-muted-foreground">Puanı eşiğin altında kalan ya da değerlendirme bekleyen konular. Kaynak sayısı arttıkça ya da trend olunca puanları yükselir.</p>
          )}
          <StoryList stories={list.stories} tab={tab} minScore={list.minScore} offset={(pageNo - 1) * STORY_PAGE_SIZE} now={requestTime()} />
          <Pagination base={BASE} params={params} page={pageNo} total={list.total} pageSize={STORY_PAGE_SIZE} />
        </>
      )}

      {tab === "trends" && trends && <TrendList trends={trends} enabled={overview.trendsEnabled} />}
      {tab === "sources" && sources && <FeedSourceManager sources={sources} />}
    </div>
  );
}
