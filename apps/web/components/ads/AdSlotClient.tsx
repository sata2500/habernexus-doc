"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { pickWeighted, type PlacementFormat, type PlacementKey, type PlacementMode, type PublicSponsorAd } from "@/lib/monetization";

type SponsorMap = Partial<Record<PlacementKey, PublicSponsorAd[]>>;

// Sayfadaki tüm reklam alanları tek istekle beslenir
let sponsorsPromise: Promise<SponsorMap> | null = null;
function loadSponsors(): Promise<SponsorMap> {
  if (!sponsorsPromise) {
    sponsorsPromise = fetch("/api/ads")
      .then((r) => (r.ok ? r.json() : { sponsors: {} }))
      .then((d: { sponsors?: SponsorMap }) => d.sponsors ?? {})
      .catch(() => ({}));
    // Sayfalar arasında gezinirken birkaç dakikada bir tazelenir
    setTimeout(() => { sponsorsPromise = null; }, 5 * 60_000);
  }
  return sponsorsPromise;
}

const FRAME: Record<PlacementFormat, string> = {
  // Sponsor görselleri: telefonda 640×200, geniş ekranda 970×250
  banner: "w-full max-w-[970px] aspect-[16/5] sm:aspect-[97/25]",
  box: "w-full max-w-[300px] aspect-[6/5]",
};
const ADSENSE_MIN: Record<PlacementFormat, string> = {
  banner: "w-full min-h-[100px] sm:min-h-[90px]",
  box: "w-full max-w-[300px] min-h-[250px]",
};

type Choice = { kind: "sponsor"; ad: PublicSponsorAd } | { kind: "adsense" } | { kind: "none" };

export function AdSlotClient({
  placement,
  format,
  mode,
  adsenseClient,
  adsenseSlot,
  className,
}: {
  placement: PlacementKey;
  format: PlacementFormat;
  mode: Exclude<PlacementMode, "off">;
  adsenseClient: string | null;
  adsenseSlot: string | null;
  className?: string;
}) {
  const adsenseReady = !!(adsenseClient && adsenseSlot);
  const [choice, setChoice] = useState<Choice | null>(mode === "adsense" ? (adsenseReady ? { kind: "adsense" } : { kind: "none" }) : null);

  useEffect(() => {
    if (mode === "adsense") return;
    let alive = true;
    loadSponsors().then((all) => {
      if (!alive) return;
      const ad = pickWeighted(all[placement] ?? [], Math.random());
      setChoice(ad ? { kind: "sponsor", ad } : mode === "auto" && adsenseReady ? { kind: "adsense" } : { kind: "none" });
    });
    return () => { alive = false; };
  }, [mode, placement, adsenseReady]);

  if (choice?.kind === "none") return null;

  return (
    <aside aria-label="Reklam" className={cn("flex flex-col items-center gap-1 my-6", className)} data-ad-placement={placement}>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {choice?.kind === "sponsor" ? `Sponsorlu${choice.ad.advertiser ? ` · ${choice.ad.advertiser}` : ""}` : "Reklam"}
      </span>
      {choice?.kind === "sponsor" ? (
        <SponsorCreative ad={choice.ad} format={format} />
      ) : choice?.kind === "adsense" ? (
        <AdSenseUnit client={adsenseClient!} slot={adsenseSlot!} className={ADSENSE_MIN[format]} />
      ) : (
        // Yüklenirken yer ayrılır (sayfa kaymaz)
        <div className={cn(FRAME[format], "rounded-xl bg-muted/40")} />
      )}
    </aside>
  );
}

function SponsorCreative({ ad, format }: { ad: PublicSponsorAd; format: PlacementFormat }) {
  const ref = useRef<HTMLAnchorElement>(null);

  // Gösterim: reklamın en az yarısı ekranda göründüğünde bir kez
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        navigator.sendBeacon?.(`/api/ads/${ad.id}/view`);
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [ad.id]);

  return (
    <a
      ref={ref}
      href={`/api/ads/${ad.id}/click`}
      target="_blank"
      rel="sponsored noopener"
      className={cn(FRAME[format], "block overflow-hidden rounded-xl border border-border bg-muted/30 focus-visible:outline-2 focus-visible:outline-primary-500")}
    >
      <picture>
        {ad.imageUrlMobile && format === "banner" && <source media="(max-width: 639px)" srcSet={ad.imageUrlMobile} />}
        <img src={ad.imageUrl} alt={ad.altText} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </picture>
    </a>
  );
}

function AdSenseUnit({ client, slot, className }: { client: string; slot: string; className: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Reklam engelleyici ya da betik yüklenemedi: alan boş kalır
    }
  }, []);
  return (
    <ins
      className={cn("adsbygoogle block", className)}
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
