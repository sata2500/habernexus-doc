import { Skeleton, SkeletonArticleCard } from "@/components/ui/Skeleton";

export default function MainLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 animate-pulse">
      {/* ── Slider Skeleton ────────────────────────── */}
      <div className="relative w-full h-[300px] md:h-[500px] rounded-[2rem] md:rounded-[2.5rem] bg-muted/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute bottom-8 left-8 space-y-3 w-2/3">
          <Skeleton className="h-6 w-24 bg-card/40" />
          <Skeleton className="h-10 w-3/4 bg-card/30" />
          <Skeleton className="h-6 w-1/2 bg-card/20" />
        </div>
      </div>

      {/* ── Hero & Trending Section Skeleton ───────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Hero Skeleton */}
        <div className="lg:col-span-2">
          <div className="relative h-full min-h-[300px] md:min-h-[400px] rounded-2xl bg-muted/40 overflow-hidden flex items-end">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            <div className="relative z-10 p-6 md:p-8 space-y-3 w-full">
              <Skeleton className="h-5 w-24 bg-card/40" />
              <Skeleton className="h-8 w-3/4 bg-card/30" />
              <Skeleton className="h-4 w-1/2 bg-card/20" />
            </div>
          </div>
        </div>

        {/* Trending Sidebar Skeleton */}
        <div className="lg:col-span-1 border border-border rounded-2xl p-6 bg-card space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-36" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories Bar Skeleton ────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border border-border bg-card rounded-2xl p-5 flex flex-col items-center gap-2.5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Latest Articles Grid Skeleton ───────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="md:col-span-2 lg:col-span-2">
            {/* First element horizontal skeleton */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col md:flex-row h-full md:h-[320px]">
              <Skeleton className="h-48 md:h-full md:w-1/2 rounded-none" />
              <div className="p-5 md:p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>
          {[...Array(4)].map((_, i) => (
            <SkeletonArticleCard key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
