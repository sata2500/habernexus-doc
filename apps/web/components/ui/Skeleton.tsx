import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-xl",
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

/* Pre-built skeleton patterns */

function SkeletonArticleCard() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      </div>
    </div>
  );
}

/** Haber listesi sayfaları (kategori, etiket, son haberler, arama) */
function SkeletonListPage({ cards = 6 }: { cards?: number }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-8" role="status" aria-label="Haberler yükleniyor">
      <div className="space-y-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => <SkeletonArticleCard key={i} />)}
      </div>
    </div>
  );
}

/** Panel sayfaları (Panelim, yazar masası, yönetim): başlık ve içerik kartları */
function SkeletonPanelPage() {
  return (
    <div className="space-y-6 w-full" role="status" aria-label="Sayfa yükleniyor">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Not: haber, kategori ve etiket sayfalarına loading.tsx eklenmez. Akış (streaming) erken başlarsa
// olmayan sayfa 404 yerine 200 döner ve arama motorları bunu gerçek sayfa sanar.
export { Skeleton, SkeletonArticleCard, SkeletonListPage, SkeletonPanelPage };
